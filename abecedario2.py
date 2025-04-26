import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp

# Cargar modelo
model = tf.keras.models.load_model("savedmodel/model.savedmodel")

# Cargar etiquetas desde labels.txt
with open("savedmodel/labels.txt", "r") as f:
    class_names = [line.strip().split()[1] for line in f.readlines()]

# Inicializar MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

# Cargar diccionario desde archivo externo
with open("es_50k.txt", "r", encoding="utf-8") as f:
    diccionario = [line.strip().lower().split()[0] for line in f if line.strip()]

# Función para sugerencias
def sugerir_palabras(parcial, diccionario):
    parcial = parcial.lower()
    return [palabra for palabra in diccionario if palabra.startswith(parcial)]

# Inicializar cámara
cap = cv2.VideoCapture(0)

# Variables para estabilidad y predicción
letra_anterior = ""
contador_estabilidad = 0
umbral_estabilidad = 15
frase_actual = ""

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    # Convertir a RGB para MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_frame)

    # Solo proceder si se detectan manos
    if results.multi_hand_landmarks:
        # Preprocesamiento
        img = cv2.resize(frame, (224, 224))
        img = img.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)

        # Predicción
        predictions = model.predict(img)
        class_index = np.argmax(predictions)
        confidence = np.max(predictions)
        letra_detectada = class_names[class_index]

        # Mostrar predicción
        label = f"{letra_detectada}: {confidence:.2f}"
        cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (213, 84, 58), 2)

        # Agregar letra si cumple con estabilidad y confianza
        if confidence > 0.9:
            if letra_detectada == letra_anterior:
                contador_estabilidad += 1
            else:
                contador_estabilidad = 0
                letra_anterior = letra_detectada

            if contador_estabilidad == umbral_estabilidad:
                frase_actual += letra_detectada
                contador_estabilidad = 0  # Reiniciar contador

    # Obtener última palabra de la frase
    palabras = frase_actual.split()
    palabra_actual = palabras[-1] if palabras else ""

    # Obtener sugerencias
    sugerencias = sugerir_palabras(palabra_actual, diccionario)

    # Mostrar palabra actual y sugerencias
    cv2.putText(frame, f"Palabra: {palabra_actual}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (10, 255, 255), 2)
    cv2.putText(frame, "Sugerencias: " + ", ".join(sugerencias[:3]), (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

    # Mostrar frase completa
    cv2.putText(frame, f"Frase: {frase_actual}", (10, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 232), 2)

    # Mostrar frame
    cv2.imshow("Reconocimiento LSC", frame)

    # Capturar tecla presionada
    key = cv2.waitKey(1) & 0xFF

    # Salir con barra espaciadora
    if key == ord(' '):
        break
    elif key == ord('b'):  # Borrar última letra si se presiona 'b'
        if frase_actual:
            frase_actual = frase_actual[:-1]
    
    elif key in [ord('1'), ord('2'), ord('3'), ord('4')]:  # seleccionar sugerencia
        indice = key - ord('1')
        if indice < len(sugerencias):
            palabra_seleccionada = sugerencias[indice]
            if palabras:
                palabras[-1] = palabra_seleccionada
            else:
                palabras.append(palabra_seleccionada)
            frase_actual = " ".join(palabras) + " "

cap.release()
cv2.destroyAllWindows()
