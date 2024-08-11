# UPTC Comidas Bot

Este proyecto es un bot de Telegram que proporciona información sobre las comidas diarias en el restaurante de la UPTC. Utiliza la API del restaurante para obtener datos sobre almuerzos y cenas, y notifica a los usuarios diariamente a las 10 a.m.

## Requisitos

- [Node.js](https://nodejs.org/) (versión 16.0.0 o superior)

## Instalación

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/tu_usuario/uptc-comidas-bot.git

## Instalar las dependencias:

 ```bash
npm install
```

## Configurar las variables de entorno:

Crea un archivo .env en la raíz del proyecto y añade tu token de Telegram, Usuario y Contraseña:

 ```env
TELEGRAM_BOT_TOKEN=tu_token_de_telegram
user=tu_usuario
password=tu_contraseña
```

## Ejecución
Para iniciar el bot, ejecuta el siguiente comando:

 ```bash
npm start
```

El bot comenzará a funcionar y te notificará diariamente con la comida del día a las 10 a.m.

## Comandos
- /start - Comienza a recibir notificaciones diarias de la comida a las 10 a.m.
- /comida MM/DD - Consulta la comida para una fecha específica (formato MM/DD).
- /help - Muestra este mensaje de ayuda.
