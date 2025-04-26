import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp

# Cargar modelo
model = tf.keras.models.load_model("savedmodel/model.savedmodel")

# Cargar etiquetas
with open("savedmodel/labels.txt", "r") as f:
    class_names = [line.strip() for line in f.readlines()]

# Inicializar MediaPipe
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# Función para dibujar y devolver la caja que encierra la mano
def draw_bounding_box(image, hand_landmarks):
    img_height, img_width, _ = image.shape
    x_coords = [lm.x * img_width for lm in hand_landmarks.landmark]
    y_coords = [lm.y * img_height for lm in hand_landmarks.landmark]
    
    # Calcular coordenadas del bounding box
    x_min, x_max = int(min(x_coords)), int(max(x_coords))
    y_min, y_max = int(min(y_coords)), int(max(y_coords))
    
    # Añadir un margen
    margin = 20
    x_min = max(0, x_min - margin)
    y_min = max(0, y_min - margin)
    x_max = min(img_width, x_max + margin)
    y_max = min(img_height, y_max + margin)

    # Dibujar el recuadro
    cv2.rectangle(image, (x_min, y_min), (x_max, y_max), (255, 0, 0), 2)

    return x_min, y_min, x_max, y_max

# Inicializar cámara
cap = cv2.VideoCapture(0)

with mp_hands.Hands(
    model_complexity=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=2
) as hands:

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)

        if results.multi_hand_landmarks:
            for num, hand_landmarks in enumerate(results.multi_hand_landmarks):
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                # Obtener el recuadro de la mano
                x_min, y_min, x_max, y_max = draw_bounding_box(frame, hand_landmarks)

                # Recortar imagen de la mano
                hand_img = frame[y_min:y_max, x_min:x_max]
                if hand_img.size == 0:
                    continue  # Saltar si el recorte está vacío

                # Preprocesar imagen para el modelo
                img = cv2.resize(hand_img, (224, 224))
                img = img.astype(np.float32) / 255.0
                img = np.expand_dims(img, axis=0)

                # Predicción
                predictions = model.predict(img)
                class_index = np.argmax(predictions)
                confidence = np.max(predictions)

                label = f"{class_names[class_index]}: {confidence:.2f}"
                cv2.putText(frame, label, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        # Mostrar resultado
        cv2.imshow("Reconocimiento LSC con ROI", frame)

        if cv2.waitKey(1) & 0xFF == ord(' '):
            break

cap.release()
cv2.destroyAllWindows()
