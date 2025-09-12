[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

# SRT Lyric Sync

Sube un archivo de audio o un video con audio y proporciona la letra completa o un archivo SRT, VTT o LRC para generar automáticamente un archivo de subtítulos SRT, VTT o LRC sincronizado usando IA.

![SRT Lyric Sync - Interfaz Principal](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-12%2014.48.26.png)
![SRT Lyric Sync - Vista del Editor](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-12%2014.50.11.png)

## ✨ Características

*   **Sincronización con IA**: Sube tu archivo multimedia (video o audio) y proporciona la letra para obtener un archivo de subtítulos perfectamente sincronizado en segundos.
*   **Refinamiento de Alta Precisión con IA**: Afina los tiempos generados con un solo clic, aprovechando la IA para analizar el decaimiento vocal y el fraseo para una precisión de nivel profesional.
*   **Editor Interactivo Avanzado**:
    *   **Marcado de Tiempo con Un Clic**: Haz clic en el icono de objetivo junto a cualquier campo de tiempo para establecerlo instantáneamente en la posición de reproducción actual del video.
    *   **Arrastrar y Soltar**: Reordena las líneas de subtítulos sin esfuerzo.
    *   **Menú Contextual (Clic Derecho)**: Inserta rápidamente nuevas líneas, fusiona con la siguiente línea o elimina.
    *   **División al Vuelo**: Coloca el cursor en el texto y haz clic en "Dividir" para dividir instantáneamente una línea larga en dos, con los tiempos calculados automáticamente.
    *   **Asistente de Teclado para Tiempos**: Usa las teclas de flecha en los campos de tiempo para ajustes precisos de 100ms (o saltos de 1 segundo con Shift). Reproduce/pausa el video con la barra espaciadora cuando no estés escribiendo.
*   **Controles de Sincronización Global**:
    *   **Deslizador de Desplazamiento (Offset)**: Desplaza todos los tiempos hacia adelante o hacia atrás a la vez para alinear perfectamente toda la pista de subtítulos.
    *   **Ayudante de Decaimiento Vocal**: Añade un relleno uniforme al final de cada línea para que coincida mejor con el desvanecimiento natural de la voz de un cantante.
*   **Vista Previa de Video en Tiempo Real**: Ve tus ediciones reflejadas al instante en el reproductor de video personalizado. La lista de subtítulos se desplaza automáticamente a la línea que se está reproduciendo.
*   **Entrada/Salida Flexible**: Importa letras desde archivos `.srt`, `.vtt` y `.lrc`, o pega texto sin formato. Exporta tu trabajo a cualquiera de estos formatos con el menú de descarga simplificado.
*   **Autoguardado de Borradores**: Tu progreso se guarda automáticamente en tu navegador, para que puedas continuar donde lo dejaste.

## 🚀 Cómo Usar

1.  **Subir Multimedia**: Arrastra y suelta o selecciona tu archivo de video/audio.
2.  **Proporcionar la Letra**: Pega la letra o importa un archivo de subtítulos existente.
3.  **Generar**: Haz clic en el botón "Generar" para que la IA cree los subtítulos sincronizados iniciales.
4.  **Editar y Refinar**: Usa el potente editor para hacer los ajustes necesarios. Utiliza el botón "Refinar" para mejoras de sincronización asistidas por IA.
5.  **Descargar**: Exporta tus subtítulos sincronizados en el formato que desees.

---

## 🌐 Demo en Vivo

[Prueba SRT Lyric Sync Aquí](https://srt-lyric-sync-ver-1-3-3-369376059789.us-west1.run.app/)

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