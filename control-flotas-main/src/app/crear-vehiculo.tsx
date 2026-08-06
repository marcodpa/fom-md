import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { gradoPorValor } from '@/lib/licencias';
import { validarAnio, validarIdVehiculo, validarPlaca } from '@/lib/validate';
import { LISTA_MARCAS, MARCAS, TIPOS_VEHICULO, tipoVehiculoPorValor } from '@/lib/vehiculos';
import {
  asignarConductorPrincipal,
  asociarGps,
  crearVehiculo,
  esDesempleados,
  getAreas,
  getEmpresasAsignables,
  getGpsDisponibles,
  getUsuariosDeEmpresa,
  probarPanicoGps,
  registrarGps,
  verificarGps,
} from '@/services';
import { useTheme } from '@/theme';
import type { Gps, Vehicle } from '@/types';

/** Pasos del alta (FOM-02 §1.2). El GPS es un paso DENTRO del alta. */
type Paso = 1 | 2 | 3 | 4;

/** Documentos del vehículo con vencimiento (§1.2 paso 2 + §8-2). */
const DOCS = ['Trimestres', 'Responsabilidad civil (RCV)', 'Carné de circulación', 'Póliza de seguro'];

/** Valida fecha AAAA-MM-DD. */
function fechaValida(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) && !Number.isNaN(Date.parse(s.trim()));
}

/**
 * ALTA DE VEHÍCULO (FOM-02 §1.2) — wizard de 4 pasos. Lo usa el Admin (elige
 * la empresa) y también el SUPERVISOR desde su panel (su empresa llega fija
 * por parámetro). Regla dura: no se puede terminar de crear un vehículo sin su
 * GPS (registrado modelo → IMEI → línea O uno ya registrado en stock, asociado
 * y VERIFICADO). Se puede asignar el conductor principal en el mismo alta. Al
 * crear queda "activo y reportando" y se registra la auditoría.
 */
export default function CrearVehiculoScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  // Empresa fija cuando se entra desde el panel del supervisor.
  const params = useLocalSearchParams<{ companyId?: string }>();
  const empresaFija = params.companyId || null;

  const [paso, setPaso] = useState<Paso>(1);
  const [error, setError] = useState<string | null>(null);

  // ── Paso 1: datos del vehículo ──
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [tipoValor, setTipoValor] = useState('camioneta');
  const [idUnidad, setIdUnidad] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(empresaFija);
  const [alias, setAlias] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [empresaPickerVisible, setEmpresaPickerVisible] = useState(false);
  const [marcaPicker, setMarcaPicker] = useState(false);
  const [modeloPicker, setModeloPicker] = useState(false);
  const [tipoPicker, setTipoPicker] = useState(false);
  const [areaPicker, setAreaPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  // Conductor principal (opcional): asignar la persona en el mismo alta.
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [principalPickerVisible, setPrincipalPickerVisible] = useState(false);

  // El tipo define la CLASE (para filtrar conductores por su grado de licencia)
  // y la PLANTILLA de inspección que se guarda.
  const tipoV = tipoVehiculoPorValor(tipoValor);
  const clase = tipoV?.clase ?? 'liviano';
  const plantilla = tipoV?.plantilla ?? 'otro';
  // Modelos de la marca elegida (o texto libre si la marca no tiene catálogo).
  const modelosDeMarca = marca ? (MARCAS[marca] ?? []) : [];
  const marcaSinCatalogo = !!marca && modelosDeMarca.length === 0;

  // ── Paso 2: documentos (vencimientos) ──
  const [vencimientos, setVencimientos] = useState<Record<string, string>>({});

  // ── Paso 3: GPS (equipo nuevo o uno YA registrado en stock) ──
  const [gpsOrigen, setGpsOrigen] = useState<'nuevo' | 'existente'>('nuevo');
  const [gpsModelo, setGpsModelo] = useState('');
  const [gpsImei, setGpsImei] = useState('');
  const [gpsLinea, setGpsLinea] = useState('');
  const [pinSupport, setPinSupport] = useState<'si' | 'no'>('no');
  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsOcupado, setGpsOcupado] = useState(false);
  const [gpsPickerVisible, setGpsPickerVisible] = useState(false);
  const [verificacion, setVerificacion] = useState<'pendiente' | 'fallo' | 'ok'>('pendiente');
  const [verifDetalle, setVerifDetalle] = useState<string | null>(null);
  const [panicoProbado, setPanicoProbado] = useState(false);

  // ── Paso 4 ──
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState<Vehicle | null>(null);

  const { data: empresas } = useAsyncData(getEmpresasAsignables, []);
  // Conductores de la empresa elegida (para asignar el principal en el alta).
  const { data: usuarios } = useAsyncData(
    () => (companyId ? getUsuariosDeEmpresa(companyId) : Promise.resolve([])),
    [companyId],
  );
  // Áreas de la empresa (para la asignación opcional).
  const { data: areas } = useAsyncData(
    () => (companyId ? getAreas(companyId) : Promise.resolve([])),
    [companyId],
  );
  // Equipos en stock (registrados sin vehículo) para el alta con GPS existente.
  const { data: gpsStock } = useAsyncData(getGpsDisponibles, []);
  const empresaNombre = empresas?.find((e) => e.id === companyId)?.name ?? 'Elegir empresa…';

  // Conductores APTOS: de la empresa, con rol conductor y cuyo GRADO de
  // licencia autoriza esta CLASE de vehículo (spec: solo aparecen los que
  // pueden manejarlo).
  const conductoresAptos = (usuarios ?? []).filter((u) => {
    const esConductor = !u.role || u.role === 'conductor' || u.role === 'driver';
    const cat = u.licencia?.categoria;
    if (!esConductor || !cat) return false;
    // Grado venezolano ('1'..'5'): su grado debe cubrir la clase. Licencia
    // internacional (texto libre, sin grado reconocido): no podemos verificar el
    // grado, así que se acepta en vez de bloquear el alta.
    const grado = gradoPorValor(cat);
    return grado ? grado.cubre.includes(clase) : true;
  });
  const principalNombre = conductoresAptos.find((u) => u.id === principalId)?.nombre ?? 'Elige el conductor';
  const areaNombre = areas?.find((a) => a.id === areaId)?.nombre ?? 'Sin área (opcional)';

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Alta de vehículo: SOLO la administración FOM. Los administradores de una
  // ente no dan de alta vehículos (solo asignan conductores a los existentes).
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  function validarPaso1(): boolean {
    const e: Record<string, string | null> = {};
    e.placa = validarPlaca(placa);
    if (!marca.trim()) e.marca = 'Elige la marca.';
    if (!modelo.trim()) e.modelo = 'Elige el modelo.';
    e.anio = validarAnio(anio);
    e.idUnidad = validarIdVehiculo(idUnidad);
    if (!companyId) e.empresa = 'Asigna el vehículo a una empresa.';
    if (!alias.trim()) e.alias = 'Ponle el alias interno (ej. "Unidad 07").';
    // Titular OBLIGATORIO: todo vehículo se crea con un conductor que pueda
    // manejarlo (licencia que autorice su clase).
    if (!principalId) e.principal = 'Asigna un conductor que pueda manejar este vehículo.';
    setErrores(e);
    return !Object.values(e).some(Boolean);
  }

  function validarPaso2(): boolean {
    for (const doc of DOCS) {
      if (!fechaValida(vencimientos[doc] ?? '')) {
        setError(`Indica el vencimiento de "${doc}" en formato AAAA-MM-DD.`);
        return false;
      }
    }
    return true;
  }

  function avanzar() {
    setError(null);
    if (paso === 1 && validarPaso1()) setPaso(2);
    else if (paso === 2 && validarPaso2()) setPaso(3);
  }

  /** 3.1 — Registrar equipo (modelo → IMEI → línea, IMEI único). */
  async function onRegistrarGps() {
    setError(null);
    if (!gpsModelo.trim() || !gpsImei.trim() || !gpsLinea.trim()) {
      setError('Completa modelo, IMEI y línea del equipo (en ese orden).');
      return;
    }
    setGpsOcupado(true);
    try {
      const nuevo = await registrarGps({
        modelo: gpsModelo,
        imei: gpsImei,
        linea: gpsLinea,
        pinSupport: pinSupport === 'si',
      });
      // 3.2 — Asociar: GPS ↔ este vehículo; hereda la empresa del vehículo.
      // El vehículo aún no existe (se crea al final), así que la asociación
      // definitiva se sella al crear; aquí queda la empresa heredada.
      if (companyId) await asociarGps(nuevo.id, 'pendiente-alta', companyId);
      setGps(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el equipo.');
    } finally {
      setGpsOcupado(false);
    }
  }

  /** 3.1-bis — Elegir un equipo YA registrado (stock) para este alta. */
  async function onElegirGpsExistente(sel: Gps) {
    setError(null);
    setGpsOcupado(true);
    try {
      if (companyId) await asociarGps(sel.id, 'pendiente-alta', companyId);
      setGps(sel);
      if (sel.verificado) {
        setVerificacion('ok');
        setVerifDetalle('El equipo ya estaba verificado y reporta posición.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo elegir el equipo.');
    } finally {
      setGpsOcupado(false);
    }
  }

  /** 3.3 — Verificar que reporta posición (con reintento). */
  async function onVerificar() {
    if (!gps) return;
    setError(null);
    setGpsOcupado(true);
    try {
      const res = await verificarGps(gps.id);
      setVerificacion(res.ok ? 'ok' : 'fallo');
      setVerifDetalle(res.detalle);
    } finally {
      setGpsOcupado(false);
    }
  }

  /** Prueba opcional del botón de pánico físico. */
  async function onProbarPanico() {
    if (!gps) return;
    setGpsOcupado(true);
    try {
      await probarPanicoGps(gps.id);
      setPanicoProbado(true);
    } finally {
      setGpsOcupado(false);
    }
  }

  /** Paso 4 — crear el vehículo + auditoría. */
  async function onCrear() {
    if (!gps || !companyId || !user || creando) return;
    setCreando(true);
    setError(null);
    try {
      const vehicle = await crearVehiculo({
        companyId,
        marca,
        modelo,
        anio: Number(anio),
        placa,
        tipo: plantilla,
        numero: idUnidad,
        areaId: areaId ?? undefined,
        alias,
        gpsId: gps.id,
        documentos: DOCS.map((doc) => ({ tipo: doc, venceEn: vencimientos[doc].trim() })),
      });
      await asociarGps(gps.id, vehicle.id, companyId);
      // Titular en el mismo alta (si se eligió; §3.5). La auditoría del alta la
      // registra el propio servicio crearVehiculo.
      if (principalId) await asignarConductorPrincipal(vehicle.id, principalId);
      setCreado(vehicle);
      setPaso(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el vehículo.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Nuevo vehículo" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {/* Avance del alta (4 pasos, §1.2). */}
            <View style={{ gap: spacing.xs }}>
              <ProgressBar value={(paso / 4) * 100} color={colors.primary} />
              <ThemedText variant="caption" color="textMuted">
                {paso === 1 && 'Paso 1 de 4 · Datos del vehículo'}
                {paso === 2 && 'Paso 2 de 4 · Documentos y vencimientos'}
                {paso === 3 && 'Paso 3 de 4 · Instalar GPS (obligatorio)'}
                {paso === 4 && 'Paso 4 de 4 · Vehículo creado'}
              </ThemedText>
            </View>

            {/* El contenido del paso entra con un gesto suave: orienta el avance
                del wizard (movimiento que comunica estado, no decora). */}
            <Appear key={paso} distance={8} style={{ gap: spacing.lg }}>
            {/* ── PASO 1: datos ── */}
            {paso === 1 ? (
              <Card style={{ gap: spacing.md }}>
                <TextField label="Placa" value={placa} onChangeText={setPlaca} placeholder="AB123CD" autoCapitalize="characters" error={errores.placa ?? undefined} />

                {/* Marca (buscador). */}
                <View style={{ gap: spacing.xs }}>
                  <PickerField label="Marca" value={marca || 'Elige la marca'} onPress={() => setMarcaPicker(true)} />
                  {errores.marca ? (
                    <ThemedText variant="caption" color="danger">{errores.marca}</ThemedText>
                  ) : null}
                </View>

                {/* Modelo (buscador por marca, o libre si la marca no tiene catálogo). */}
                {marcaSinCatalogo ? (
                  <TextField label="Modelo" value={modelo} onChangeText={setModelo} placeholder="Modelo" error={errores.modelo ?? undefined} />
                ) : (
                  <View style={{ gap: spacing.xs }}>
                    <PickerField
                      label="Modelo"
                      value={modelo || (marca ? 'Elige el modelo' : 'Elige la marca primero')}
                      onPress={() => {
                        if (marca) setModeloPicker(true);
                      }}
                      disabled={!marca}
                    />
                    {errores.modelo ? (
                      <ThemedText variant="caption" color="danger">{errores.modelo}</ThemedText>
                    ) : null}
                  </View>
                )}

                <TextField
                  label="Año"
                  value={anio}
                  onChangeText={(t) => setAnio(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="2023"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  error={errores.anio ?? undefined}
                />

                {/* Tipo de vehículo (incluye industriales). Define qué grado de
                    licencia se exige al conductor. */}
                <PickerField label="Tipo de vehículo" value={tipoV?.label ?? 'Elige el tipo'} onPress={() => setTipoPicker(true)} />

                {/* Id de la unidad en el sistema (empareja con el conductor/chip). */}
                <TextField
                  label="Id de la unidad"
                  value={idUnidad}
                  onChangeText={(t) => setIdUnidad(t.replace(/\s/g, ''))}
                  placeholder="Ej. U-07, CAM-123, #A15"
                  autoCapitalize="characters"
                  error={errores.idUnidad ?? undefined}
                />

                {empresaFija ? (
                  <View style={{ gap: spacing.xs }}>
                    <ThemedText variant="overline" color="textMuted">
                      Empresa
                    </ThemedText>
                    <Chip tone="info" label={empresaNombre} />
                  </View>
                ) : (
                  <View style={{ gap: spacing.xs }}>
                    <PickerField label="Asignar empresa" value={empresaNombre} onPress={() => setEmpresaPickerVisible(true)} />
                    {errores.empresa ? (
                      <ThemedText variant="caption" color="danger">{errores.empresa}</ThemedText>
                    ) : null}
                  </View>
                )}

                <TextField
                  label="Alias (nombre interno de la empresa)"
                  value={alias}
                  onChangeText={setAlias}
                  placeholder='Ej. "Unidad 07", "Camioneta de Producción"'
                  error={errores.alias ?? undefined}
                />

                {/* Área de la empresa (opcional). */}
                <PickerField
                  label="Área de la empresa (opcional)"
                  value={areaNombre}
                  onPress={() => {
                    if (companyId) setAreaPicker(true);
                    else setError('Primero asigna la empresa.');
                  }}
                />

                {/* Conductor principal (obligatorio): solo los que su licencia autoriza. */}
                <View style={{ gap: 4 }}>
                  <PickerField
                    label="Conductor principal"
                    value={principalNombre}
                    onPress={() => {
                      if (companyId) setPrincipalPickerVisible(true);
                      else setError('Primero asigna la empresa.');
                    }}
                  />
                  {errores.principal ? (
                    <ThemedText variant="caption" color="danger">{errores.principal}</ThemedText>
                  ) : null}
                </View>
                <ThemedText variant="caption" color="textMuted">
                  {companyId && conductoresAptos.length === 0
                    ? `Esta empresa aún no tiene conductores con licencia para este tipo (${tipoV?.label ?? '—'}). Regístralos primero.`
                    : `Debes asignar un conductor cuya licencia autorice este tipo de vehículo (${tipoV?.label ?? '—'}).`}
                </ThemedText>
              </Card>
            ) : null}

            {/* ── PASO 2: documentos con vencimientos ── */}
            {paso === 2 ? (
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="caption" color="textSecondary">
                  Registra el vencimiento de cada documento del vehículo.
                </ThemedText>
                {DOCS.map((doc) => (
                  <TextField
                    key={doc}
                    label={doc}
                    value={vencimientos[doc] ?? ''}
                    onChangeText={(v) => setVencimientos((s) => ({ ...s, [doc]: v }))}
                    placeholder="AAAA-MM-DD"
                    keyboardType="numbers-and-punctuation"
                  />
                ))}
              </Card>
            ) : null}

            {/* ── PASO 3: GPS (3.1 registrar/elegir → 3.2 asociar → 3.3 verificar) ── */}
            {paso === 3 ? (
              <>
                {/* Equipo NUEVO o uno YA registrado (en stock, sin vehículo). */}
                {!gps ? (
                  <SegmentedControl
                    options={[
                      { value: 'nuevo', label: 'Equipo nuevo' },
                      { value: 'existente', label: `Ya registrado (${(gpsStock ?? []).length})` },
                    ]}
                    value={gpsOrigen}
                    onChange={setGpsOrigen}
                  />
                ) : null}

                {gpsOrigen === 'existente' && !gps ? (
                  <Card style={{ gap: spacing.md }}>
                    <ThemedText variant="overline" color="textMuted">
                      3.1 · Elegir equipo registrado
                    </ThemedText>
                    <PickerField
                      label="Equipo GPS en stock"
                      value="Elegir equipo…"
                      onPress={() => setGpsPickerVisible(true)}
                    />
                    {(gpsStock ?? []).length === 0 ? (
                      <ThemedText variant="caption" color="textMuted">
                        No hay equipos registrados sin vehículo. Registra uno nuevo.
                      </ThemedText>
                    ) : null}
                  </Card>
                ) : null}

                {gpsOrigen === 'nuevo' ? (
                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    3.1 · Registrar equipo
                  </ThemedText>
                  <TextField
                    label="1° Modelo de GPS"
                    value={gpsModelo}
                    onChangeText={setGpsModelo}
                    placeholder="Teltonika FMC150"
                    editable={!gps}
                  />
                  <TextField
                    label="2° IMEI (único)"
                    value={gpsImei}
                    onChangeText={setGpsImei}
                    placeholder="356938035643999"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    editable={!gps && gpsModelo.trim().length > 0}
                  />
                  <TextField
                    label="3° Línea telefónica asociada"
                    value={gpsLinea}
                    onChangeText={setGpsLinea}
                    placeholder="0414-5550000"
                    keyboardType="phone-pad"
                    editable={!gps && gpsImei.trim().length > 0}
                  />
                  <View style={{ gap: spacing.sm }}>
                    <ThemedText variant="overline" color="textMuted">
                      ¿El equipo soporta identificación por PIN?
                    </ThemedText>
                    <SegmentedControl
                      options={[
                        { value: 'no', label: 'Sin PIN' },
                        { value: 'si', label: 'Con PIN' },
                      ]}
                      value={pinSupport}
                      onChange={(v) => {
                        if (!gps) setPinSupport(v);
                      }}
                    />
                  </View>
                  {!gps ? (
                    <Button
                      label={gpsOcupado ? 'Registrando…' : 'Registrar equipo'}
                      onPress={onRegistrarGps}
                      loading={gpsOcupado}
                    />
                  ) : (
                    <Chip tone="success" label="Equipo registrado" />
                  )}
                </Card>
                ) : null}

                {gpsOrigen === 'existente' && gps ? (
                  <Card style={{ gap: spacing.sm }}>
                    <ThemedText variant="overline" color="textMuted">
                      Equipo elegido
                    </ThemedText>
                    <ThemedText variant="body">{`${gps.modelo} · IMEI ${gps.imei}`}</ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      {`Línea ${gps.linea}${gps.pinSupport ? ' · con PIN' : ' · sin PIN'}`}
                    </ThemedText>
                  </Card>
                ) : null}

                {gps ? (
                  <Card style={{ gap: spacing.md }}>
                    <ThemedText variant="overline" color="textMuted">
                      3.2 · Asociación
                    </ThemedText>
                    <ThemedText variant="body" color="textSecondary">
                      {`GPS ${gps.modelo} ↔ ${placa.toUpperCase()} · hereda la empresa ${empresaNombre}.`}
                    </ThemedText>

                    <ThemedText variant="overline" color="textMuted">
                      3.3 · Verificar
                    </ThemedText>
                    {verificacion === 'ok' ? (
                      <>
                        <Chip tone="success" label="Reporta posición ✓" />
                        {verifDetalle ? (
                          <ThemedText variant="caption" color="textSecondary">
                            {verifDetalle}
                          </ThemedText>
                        ) : null}
                        <Button
                          label={
                            panicoProbado
                              ? 'Botón de pánico probado ✓'
                              : gpsOcupado
                                ? 'Probando…'
                                : 'Probar botón de pánico (opcional)'
                          }
                          variant="secondary"
                          onPress={onProbarPanico}
                          loading={gpsOcupado}
                          disabled={panicoProbado}
                        />
                        <Button label={creando ? 'Creando…' : 'Crear vehículo'} onPress={onCrear} loading={creando} />
                      </>
                    ) : (
                      <>
                        {verificacion === 'fallo' && verifDetalle ? (
                          <ThemedText variant="caption" color="danger">
                            {verifDetalle}
                          </ThemedText>
                        ) : null}
                        <Button
                          label={
                            gpsOcupado
                              ? 'Verificando…'
                              : verificacion === 'fallo'
                                ? 'Reintentar verificación'
                                : '¿Reporta posición? Verificar'
                          }
                          onPress={onVerificar}
                          loading={gpsOcupado}
                        />
                      </>
                    )}
                  </Card>
                ) : null}
              </>
            ) : null}

            {/* ── PASO 4: creado ✓ ── */}
            {paso === 4 && creado ? (
              <View style={[styles.successCenter, { gap: spacing.lg }]}>
                <View style={[styles.successDot, { backgroundColor: colors.successSurface }]}>
                  <ThemedText variant="title" color="success">
                    ✓
                  </ThemedText>
                </View>
                <View style={{ gap: spacing.xs, alignItems: 'center' }}>
                  <ThemedText variant="title" style={styles.center}>
                    Vehículo creado
                  </ThemedText>
                  <Chip tone="success" label="Activo y reportando" />
                </View>
                <Card style={[styles.fullWidth, { gap: spacing.sm }]}>
                  <ThemedText variant="body">{`${creado.marca} ${creado.modelo} · ${creado.placa}`}</ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {`Alias: ${creado.alias} · Empresa: ${empresaNombre}`}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {gps ? `GPS: ${gps.modelo} · IMEI ${gps.imei}${gps.pinSupport ? ' · con PIN' : ''}` : ''}
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Auditoría registrada: quién lo creó, qué GPS se instaló y cuándo (visible solo
                    para el Admin).
                  </ThemedText>
                </Card>
                <Button label="Listo" onPress={() => router.back()} style={styles.fullWidth} />
              </View>
            ) : null}
            </Appear>

            {error ? (
              <ThemedText variant="caption" color="danger">
                {error}
              </ThemedText>
            ) : null}

            {/* Avance de los pasos 1 y 2 (el 3 avanza al crear). */}
            {paso === 1 || paso === 2 ? (
              <View style={{ gap: spacing.sm }}>
                <Button label="Continuar" onPress={avanzar} />
                {paso === 2 ? (
                  <Button label="Volver al paso anterior" variant="secondary" onPress={() => setPaso(1)} />
                ) : null}
              </View>
            ) : null}
            {paso === 3 ? (
              <Button label="Volver al paso anterior" variant="secondary" onPress={() => setPaso(2)} />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <OptionPickerModal
          visible={empresaPickerVisible}
          title="Asignar empresa"
          options={(empresas ?? []).filter((e) => !esDesempleados(e.id)).map((e) => ({ id: e.id, label: e.name }))}
          selectedIds={companyId ? [companyId] : []}
          onChange={(ids) => {
            setCompanyId(ids[0] ?? null);
            // Cambiar de empresa invalida al principal y al área (son de otra empresa).
            setPrincipalId(null);
            setAreaId(null);
          }}
          onClose={() => setEmpresaPickerVisible(false)}
        />

        {/* Marca (buscador). Cambiarla limpia el modelo elegido. */}
        <OptionPickerModal
          visible={marcaPicker}
          title="Marca del vehículo"
          searchable
          options={LISTA_MARCAS.map((m) => ({ id: m, label: m }))}
          selectedIds={marca ? [marca] : []}
          onChange={(ids) => {
            const m = ids[0] ?? '';
            setMarca(m);
            setModelo('');
          }}
          onClose={() => setMarcaPicker(false)}
        />

        {/* Modelo (buscador, según la marca). */}
        <OptionPickerModal
          visible={modeloPicker}
          title={marca ? `Modelo (${marca})` : 'Modelo'}
          searchable
          options={modelosDeMarca.map((m) => ({ id: m, label: m }))}
          selectedIds={modelo ? [modelo] : []}
          onChange={(ids) => setModelo(ids[0] ?? '')}
          onClose={() => setModeloPicker(false)}
        />

        {/* Tipo de vehículo (incluye industriales). */}
        <OptionPickerModal
          visible={tipoPicker}
          title="Tipo de vehículo"
          searchable
          options={TIPOS_VEHICULO.map((t) => ({ id: t.value, label: t.label }))}
          selectedIds={[tipoValor]}
          onChange={(ids) => {
            const t = ids[0];
            if (t) {
              setTipoValor(t);
              // Cambiar el tipo puede invalidar al principal (su licencia ya no cubre).
              setPrincipalId(null);
            }
          }}
          onClose={() => setTipoPicker(false)}
        />

        {/* Área de la empresa (opcional). */}
        <OptionPickerModal
          visible={areaPicker}
          title="Área de la empresa"
          options={(areas ?? []).map((a) => ({ id: a.id, label: a.nombre }))}
          selectedIds={areaId ? [areaId] : []}
          onChange={(ids) => setAreaId(ids[0] ?? null)}
          onClose={() => setAreaPicker(false)}
        />

        {/* Conductor principal: solo los aptos (su licencia cubre este tipo). */}
        <OptionPickerModal
          visible={principalPickerVisible}
          title="Conductor principal"
          options={conductoresAptos.map((u) => ({ id: u.id, label: u.nombre }))}
          selectedIds={principalId ? [principalId] : []}
          onChange={(ids) => setPrincipalId(ids[0] ?? null)}
          onClose={() => setPrincipalPickerVisible(false)}
        />
        <OptionPickerModal
          visible={gpsPickerVisible}
          title="Equipo GPS en stock"
          options={(gpsStock ?? []).map((g) => ({
            id: g.id,
            label: `${g.modelo} · IMEI ${g.imei}`,
            helper: g.verificado ? 'Verificado · reporta posición' : 'Sin verificar todavía',
          }))}
          selectedIds={gps ? [gps.id] : []}
          onChange={(ids) => {
            const sel = (gpsStock ?? []).find((g) => g.id === ids[0]);
            if (sel) onElegirGpsExistente(sel);
          }}
          onClose={() => setGpsPickerVisible(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  successCenter: { alignItems: 'center', paddingTop: 24 },
  successDot: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
});
