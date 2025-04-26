document.addEventListener("DOMContentLoaded", () => {
    // Variables para la navegación
    const navButtons = document.querySelectorAll(".nav-btn")
    const sections = document.querySelectorAll(".section")
  
    // Variables para el carrusel
    const carouselItems = document.querySelectorAll(".carousel-item")
    const prevButton = document.querySelector(".carousel-control.prev")
    const nextButton = document.querySelector(".carousel-control.next")
    const indicators = document.querySelectorAll(".indicator")
    const videos = document.querySelectorAll(".carousel-item video")
  
    // Variables para el traductor
    const videoStream = document.getElementById("videoStream")
    const cameraPlaceholder = document.querySelector(".camera-placeholder")
    const startCameraButton = document.getElementById("startCamera")
    const stopCameraButton = document.getElementById("stopCamera")
    const serverResponse = document.getElementById("serverResponse")
  
    // Canvas para capturar frames (añadido)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
  
    let currentVideoIndex = 0
    let stream = null
    let captureInterval = null
    let isProcessing = false // Para evitar múltiples solicitudes simultáneas
  
    // Función para cambiar entre secciones
    function showSection(sectionId) {
      sections.forEach((section) => {
        section.classList.remove("active")
      })
  
      navButtons.forEach((button) => {
        button.classList.remove("active")
      })
  
      document.getElementById(sectionId).classList.add("active")
      document.querySelector(`[data-section="${sectionId}"]`).classList.add("active")
  
      // Si cambiamos de sección, pausamos todos los videos
      if (sectionId !== "inicio") {
        pauseAllVideos()
      }
  
      // Si salimos de la sección de traductor, detenemos la cámara
      if (sectionId !== "traductor" && stream) {
        stopCamera()
      }
    }
  
    // Configurar eventos de navegación
    navButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const sectionId = this.getAttribute("data-section")
        showSection(sectionId)
      })
    })
  
    // Funciones para el carrusel de videos
    function showVideo(index) {
      // Pausar todos los videos primero
      pauseAllVideos()
  
      // Ocultar todos los items del carrusel
      carouselItems.forEach((item) => {
        item.classList.remove("active")
      })
  
      // Desactivar todos los indicadores
      indicators.forEach((indicator) => {
        indicator.classList.remove("active")
      })
  
      // Mostrar el video actual
      carouselItems[index].classList.add("active")
      indicators[index].classList.add("active")
      currentVideoIndex = index
    }
  
    function pauseAllVideos() {
      videos.forEach((video) => {
        video.pause()
      })
    }
  
    function nextVideo() {
      const newIndex = (currentVideoIndex + 1) % carouselItems.length
      showVideo(newIndex)
    }
  
    function prevVideo() {
      const newIndex = (currentVideoIndex - 1 + carouselItems.length) % carouselItems.length
      showVideo(newIndex)
    }
  
    // Configurar eventos del carrusel
    prevButton.addEventListener("click", prevVideo)
    nextButton.addEventListener("click", nextVideo)
  
    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        showVideo(index)
      })
    })
  
    // Funciones para el traductor
    async function startCamera() {
      try {
        // Cambiar estado de los botones
        startCameraButton.disabled = true
  
        // Añadir icono de carga
        startCameraButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Iniciando...
              `
  
        // Solicitar acceso a la cámara
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
  
        // Configurar el video
        videoStream.srcObject = stream
        videoStream.classList.add("active")
        cameraPlaceholder.classList.add("hidden")
  
        // Actualizar estado de los botones
        startCameraButton.disabled = true
        stopCameraButton.disabled = false
  
        // Restaurar texto del botón
        startCameraButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                  </svg>
                  Iniciar Cámara
              `
  
        // Iniciar captura de frames
        startFrameCapture()
      } catch (error) {
        console.error("Error al acceder a la cámara:", error)
        serverResponse.value = "Error: No se pudo acceder a la cámara. Por favor, verifica los permisos."
  
        // Restaurar estado de los botones
        startCameraButton.disabled = false
  
        // Restaurar texto del botón
        startCameraButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                  </svg>
                  Iniciar Cámara
              `
      }
    }
  
    function stopCamera() {
      if (stream) {
        // Detener todos los tracks de la cámara
        stream.getTracks().forEach((track) => track.stop())
        stream = null
  
        // Limpiar el video
        videoStream.srcObject = null
        videoStream.classList.remove("active")
        cameraPlaceholder.classList.remove("hidden")
  
        // Limpiar la respuesta
        serverResponse.value = ""
  
        // Detener la captura de frames
        if (captureInterval) {
          clearInterval(captureInterval)
          captureInterval = null
        }
  
        // Actualizar estado de los botones
        startCameraButton.disabled = false
        stopCameraButton.disabled = true
      }
    }
  
    // Función para capturar frames y enviarlos a la API
    function startFrameCapture() {
      // Detener intervalo anterior si existe
      if (captureInterval) {
        clearInterval(captureInterval)
      }
  
      // Crear nuevo intervalo para capturar frames cada 1 segundo
      captureInterval = setInterval(() => {
        if (!isProcessing && videoStream.videoWidth > 0) {
          captureAndSendFrame()
        }
      }, 1000) // Ajusta este valor según tus necesidades
    }
  
    // Función para capturar un frame y enviarlo a la API
async function captureAndSendFrame() {
  try {
    isProcessing = true;

    // Configurar el canvas con las dimensiones del video
    canvas.width = videoStream.videoWidth;
    canvas.height = videoStream.videoHeight;

    // Dibujar el frame actual en el canvas
    ctx.drawImage(videoStream, 0, 0, canvas.width, canvas.height);

    // Convertir el canvas a un blob de imagen en calidad alta (JPEG 0.9)
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("No se pudo generar el blob de la imagen.");
        return;
      }

      // Crear un FormData para enviar la imagen
      const formData = new FormData();
      formData.append("image", blob, "captured_frame.jpg");
      formData.append("sourceLanguage", "auto");
      formData.append("targetLanguage", "es");

      // Enviar la imagen a la API
      const response = await sendImageToAPI(formData);

      // Mostrar la respuesta en la interfaz
      serverResponse.value = response.text || "No se detectó texto en la imagen";
    }, "image/jpeg", 0.9);
  } catch (error) {
    console.error("Error al procesar el frame:", error);
    serverResponse.value = "Error al procesar la imagen: " + error.message;
  } finally {
    isProcessing = false;
  }
}

// Función para enviar la imagen a la API usando FormData
async function sendImageToAPI(formData) {
  const socket = io("http://localhost:3000");

  try {
    serverResponse.value = "Procesando imagen...";

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData, // Enviar como multipart/form-data
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al enviar imagen a la API:", error);
    return {
      success: false,
      error: error.message,
      text: "Error al comunicarse con el servidor de traducción",
    };
  }

}
  
   
  
    // Función para simular la respuesta de la API (solo para pruebas)
    function simulateAPIResponse() {
      const examples = [
        "Hola, ¿cómo estás?",
        "Buenos días",
        "Gracias por usar nuestro traductor",
        "Esta es una demostración de traducción en tiempo real",
        "La tecnología de reconocimiento visual está procesando la imagen",
      ]
  
      // Simular un tiempo de respuesta aleatorio (entre 500ms y 1500ms)
      const delay = 500 + Math.random() * 1000
  
      return new Promise((resolve) => {
        setTimeout(() => {
          const randomIndex = Math.floor(Math.random() * examples.length)
          resolve({
            success: true,
            text: examples[randomIndex],
            confidence: 0.85 + Math.random() * 0.15,
          })
        }, delay)
      })
    }
  
    // Reemplazar la función sendImageToAPI con esta para pruebas sin API real
    // async function sendImageToAPI(imageData) {
    //     return await simulateAPIResponse();
    // }
  
    // Configurar eventos del traductor
    startCameraButton.addEventListener("click", startCamera)
    stopCameraButton.addEventListener("click", stopCamera)
  
    // Inicializar el carrusel
    showVideo(0)
  })
  
  