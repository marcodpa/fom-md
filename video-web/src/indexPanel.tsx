// Punto de entrada del video del panel completo (aparte del de la web pública, para no mezclar composiciones).
//   npx remotion studio src/indexPanel.tsx
//   npx remotion render src/indexPanel.tsx PanelCompleto out/panel-frames --sequence --image-format=jpeg
import { Composition, registerRoot } from 'remotion'
import { PanelCompleto, PANEL_TOTAL } from './panel/PanelCompleto'

registerRoot(() => <Composition id="PanelCompleto" component={PanelCompleto} durationInFrames={PANEL_TOTAL} fps={30} width={1920} height={1080} />)
