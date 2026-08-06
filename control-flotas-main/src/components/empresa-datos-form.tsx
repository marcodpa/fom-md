import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  componerRif,
  componerTelefono,
  PAIS_POR_DEFECTO,
  PAISES,
  paisPorCodigo,
  RIF_LABEL,
  separarRif,
  separarTelefono,
  TIPOS_RIF,
  type TipoRif,
} from '@/lib/paises';
import { validarEmail, validarRif, validarTelefono } from '@/lib/validate';
import { useTheme } from '@/theme';
import type { Company } from '@/types';

/** Solo los campos que cambian; `undefined` = no tocar la columna. */
export type EmpresaDatosPatch = { name: string; rif?: string; telefono?: string; email?: string };

type Props = {
  /** Empresa a precargar (por id). */
  empresa: Company;
  ocupado?: boolean;
  saveLabel?: string;
  /** Se llama solo si la validación pasa, con los campos con contenido. */
  onGuardar: (patch: EmpresaDatosPatch) => void;
};

/**
 * FORMULARIO DE DATOS DE UNA EMPRESA reutilizable por TODOS los CRUD de entes
 * (consola-empresa del admin FOM, editar-empresa del admin de compañía): mismas
 * validaciones y desplegables que el alta — RIF (tipo + dígitos), teléfono
 * (país + número) y correo. En edición se validan solo si se escriben y se
 * envían solo con contenido (no bloquea renombrar empresas creadas antes de
 * pedir estos datos, ni escribe valores vacíos). Precarga UNA vez por empresa.
 */
export function EmpresaDatosForm({ empresa, ocupado, saveLabel = 'Guardar cambios', onGuardar }: Props) {
  const { spacing } = useTheme();

  const [cargadoId, setCargadoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [rifLetra, setRifLetra] = useState<TipoRif>('J');
  const [rifNumero, setRifNumero] = useState('');
  const [paisCodigo, setPaisCodigo] = useState(PAIS_POR_DEFECTO.codigo);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [rifPicker, setRifPicker] = useState(false);
  const [paisPicker, setPaisPicker] = useState(false);
  const [errores, setErrores] = useState<Record<string, string | null>>({});

  const pais = paisPorCodigo(paisCodigo);

  useEffect(() => {
    if (cargadoId !== empresa.id) {
      setNombre(empresa.name);
      const r = separarRif(empresa.rif ?? '');
      setRifLetra(r.letra);
      setRifNumero(r.numero);
      const tel = separarTelefono(empresa.telefono ?? '');
      setPaisCodigo(tel.codigo);
      setTelefono(tel.numero);
      setEmail(empresa.email ?? '');
      setErrores({});
      setCargadoId(empresa.id);
    }
  }, [empresa, cargadoId]);

  function guardar() {
    const e: Record<string, string | null> = {};
    if (!nombre.trim()) e.nombre = 'Ponle nombre a la empresa.';
    if (rifNumero.trim()) e.rif = validarRif(rifNumero);
    if (telefono.trim()) e.telefono = validarTelefono(telefono, pais.longitud);
    if (email.trim()) e.email = validarEmail(email);
    setErrores(e);
    if (Object.values(e).some(Boolean)) return;
    onGuardar({
      name: nombre,
      ...(rifNumero.trim() ? { rif: componerRif(rifLetra, rifNumero) } : {}),
      ...(telefono.trim() ? { telefono: componerTelefono(pais.discado, telefono) } : {}),
      ...(email.trim() ? { email } : {}),
    });
  }

  return (
    <View style={{ gap: spacing.md }}>
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} editable={!ocupado} error={errores.nombre ?? undefined} />

      {/* RIF: tipo (letra) + dígitos (solo números). */}
      <View style={{ gap: spacing.xs }}>
        <PickerField label="Tipo de RIF" value={RIF_LABEL[rifLetra]} onPress={() => setRifPicker(true)} disabled={ocupado} />
        <TextField
          label="Número de RIF"
          value={rifNumero}
          onChangeText={(t) => setRifNumero(t.replace(/\D/g, ''))}
          placeholder="301234567"
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!ocupado}
          error={errores.rif ?? undefined}
        />
        {rifNumero ? (
          <ThemedText variant="caption" color="textMuted">
            {`Quedará como ${componerRif(rifLetra, rifNumero)}`}
          </ThemedText>
        ) : null}
      </View>

      {/* Teléfono: país (código) + número (solo dígitos). */}
      <View style={{ gap: spacing.xs }}>
        <PickerField label="País" value={`${pais.bandera} ${pais.nombre} (${pais.discado})`} onPress={() => setPaisPicker(true)} disabled={ocupado} />
        <TextField
          label="Teléfono"
          value={telefono}
          onChangeText={(t) => setTelefono(t.replace(/\D/g, ''))}
          placeholder={`${pais.longitud} dígitos`}
          keyboardType="phone-pad"
          inputMode="numeric"
          editable={!ocupado}
          error={errores.telefono ?? undefined}
        />
      </View>

      <TextField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        placeholder="contacto@empresa.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!ocupado}
        error={errores.email ?? undefined}
      />

      <Button label={saveLabel} onPress={guardar} loading={ocupado} />

      {/* Tipo de RIF (la letra). */}
      <OptionPickerModal
        visible={rifPicker}
        title="Tipo de RIF"
        options={TIPOS_RIF.map((l) => ({ id: l, label: RIF_LABEL[l] }))}
        selectedIds={[rifLetra]}
        onChange={(ids) => {
          const l = ids[0] as TipoRif;
          if (l) setRifLetra(l);
          setRifPicker(false);
        }}
        onClose={() => setRifPicker(false)}
      />

      {/* País del teléfono. */}
      <OptionPickerModal
        visible={paisPicker}
        title="País del teléfono"
        options={PAISES.map((p) => ({ id: p.codigo, label: `${p.bandera} ${p.nombre} (${p.discado})` }))}
        selectedIds={[paisCodigo]}
        onChange={(ids) => {
          const c = ids[0];
          if (c) setPaisCodigo(c);
          setPaisPicker(false);
        }}
        onClose={() => setPaisPicker(false)}
      />
    </View>
  );
}
