# SRT Lyric Sync

[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

Sube un archivo de audio o un video con audio y proporciona la letra completa o un archivo SRT, VTT o LRC para generar automáticamente un archivo de subtítulos SRT, VTT o LRC sincronizado usando IA.

![SRT Lyric Sync - Interfaz Principal](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-14%209.32.26.png)
![SRT Lyric Sync - Vista del Editor](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-14%209.33.37.png)

## ✨ Características

*   **Transcripción y Sincronización con IA**:
    *   **Transcripción con Un Clic**: ¿No tienes la letra? Deja que la IA transcriba el audio por ti directamente en el editor y genere subtítulos sincronizados en un solo paso.
    *   **Sincronización Automática**: Si ya tienes la letra, simplemente pégala y deja que la IA cree un archivo de subtítulos perfectamente sincronizado en segundos.
*   **Refinamiento de Alta Precisión con IA**: Afina los tiempos generados con un solo clic. La IA analiza el decaimiento vocal y el fraseo para una precisión de nivel profesional.
*   **Editor Interactivo Avanzado**:
    *   **Marcado de Tiempo con Un Clic**: Haz clic en el icono de objetivo junto a cualquier campo de tiempo para establecerlo instantáneamente en la posición de reproducción actual del video.
    *   **Reordenación por Arrastrar y Soltar**: Reordena las líneas de subtítulos sin esfuerzo.
    *   **Potente Menú Contextual (Clic Derecho)**: Inserta rápidamente nuevas líneas, fusiona con la siguiente línea, elimina o mueve líneas hacia arriba y hacia abajo.
    *   **División al Vuelo**: Coloca el cursor en el texto y haz clic en el botón "Dividir Línea" para dividir instantáneamente una línea larga en dos, con los tiempos calculados automáticamente.
    *   **Atajos de Teclado**: Usa las teclas de flecha en los campos de tiempo para ajustes precisos de 100ms (o saltos de 1 segundo con Shift). Reproduce/pausa el video con la barra espaciadora cuando no estés escribiendo.
    *   **Historial de Deshacer/Rehacer**: Nunca pierdas una edición. Avanza y retrocede a través de tus cambios con facilidad.
*   **Controles de Sincronización Global**:
    *   **Deslizador de Desplazamiento Global**: Desplaza todos los tiempos hacia adelante o hacia atrás a la vez para alinear perfectamente toda la pista de subtítulos.
    *   **Ayudante de Decaimiento Vocal**: Añade un relleno uniforme al final de cada línea para que coincida mejor con el desvanecimiento natural de la voz de un cantante.
*   **Flujo de Trabajo y E/S Flexible**:
    *   **Vista Previa de Video en Tiempo Real**: Ve tus ediciones reflejadas al instante en el reproductor de video personalizado. La lista de subtítulos se desplaza automáticamente a la línea que se está reproduciendo.
    *   **Soporte Multiformato**: Importa desde archivos `.txt`, `.srt`, `.vtt` y `.lrc`. Exporta tu trabajo a SRT, VTT o LRC con el menú de descarga simplificado.
    *   **Autoguardado y Restauración de Borradores**: Tu progreso se guarda automáticamente en tu navegador. Si te vas y vuelves, la aplicación te ofrecerá restaurar tu borrador no guardado.

## 🚀 Cómo Usar

1.  **Subir Multimedia**: Arrastra y suelta o selecciona tu archivo de video/audio.
2.  **Proporcionar la Letra**: Tienes tres opciones:
    *   **Transcribir (Recomendado)**: Haz clic en **Transcribir** para que la IA genere la letra y los tiempos automáticamente en un solo paso.
    *   **Pegar**: Pega la letra directamente en el área de texto.
    *   **Importar**: Haz clic en **Importar** para cargar la letra desde un archivo `.txt` o un archivo de subtítulos existente (`.srt`, `.vtt`, `.lrc`).
3.  **Generar/Refinar**:
    *   Si pegaste o importaste la letra, haz clic en **Generar** para crear los tiempos iniciales.
    *   Haz clic en **Refinar** en cualquier momento para usar la IA para mejorar la precisión de los tiempos de tus subtítulos actuales.
4.  **Editar**: Usa el potente editor interactivo para hacer los ajustes finales.
5.  **Descargar**: Exporta tus subtítulos sincronizados en el formato que desees (SRT, VTT o LRC).

---

## 🌐 Demo en Vivo

[Prueba SRT Lyric Sync Aquí](https://srt-lyric-sync-369376059789.us-west1.run.app/)

**Nota:** El tamaño máximo de subida para archivos multimedia es de 15MB.

## 💻 Desarrollo Local

Esta aplicación está diseñada para obtener la clave de la API de Gemini de una variable de entorno (`process.env.API_KEY`), lo cual se maneja automáticamente cuando se despliega en Google AI Studio.

Para el **desarrollo local únicamente**, necesitarás proporcionar la clave manualmente.

### 1. Establece tu Clave de API (Solución Local)
Dado que este es un proyecto estático simple sin un proceso de compilación, debes editar temporalmente `services/geminiService.ts` para insertar tu clave.

- **Abre:** `services/geminiService.ts`
- **Busca la línea:** `const API_KEY = process.env.API_KEY;`
- **Reemplázala con tu clave:** `const API_KEY = "TU_CLAVE_DE_API_DE_GEMINI_AQUÍ";`

⚠️ **CRÍTICO:** Esto es solo para pruebas locales. **No confirmes este cambio** ni lo subas a un repositorio público, ya que expondrá tu clave de API.

### 2. Ejecuta un Servidor Local
Este proyecto no necesita un proceso de compilación complejo.
- Abre una terminal en el directorio raíz del proyecto.
- Usa un servidor local simple. Por ejemplo:
  ```bash
  # Si tienes Python 3
  python -m http.server

  # Si tienes Node.js y serve
  npx serve .
  ```

### 3. Abre en el Navegador
- Navega a la URL local que se muestra en tu terminal (p. ej., `http://localhost:8000`).

---

Desarrollado con Google Gemini.