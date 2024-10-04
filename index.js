const telebot = require("telebot");
const https = require("https");
const fetch = require("node-fetch");
const schedule = require("node-schedule");
const express = require('express');
require('dotenv').config();

const app = express();
const agent = new https.Agent({
  rejectUnauthorized: false,
});

const bot = new telebot({
  token: process.env.TELEGRAM_BOT_TOKEN,
});

const urlLogin = "https://servicios2.uptc.edu.co/SiRestauranteBackEnd/login";

let authToken = null;
let tokenExpiry = null;

// Función para realizar el login y obtener el token
async function login() {
  const body = {
    user: process.env.API_USERNAME,
    password: process.env.API_PASSWORD,
  };

  const headersLogin = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/",
  };

  try {
    const response = await fetch(urlLogin, {
      method: "POST",
      headers: headersLogin,
      body: JSON.stringify(body),
      agent: agent,
    });
    const data = await response.json();
    authToken = data.validateToken; // Guardar el token
    let current = new Date();
    tokenExpiry = current.setHours(current.getHours()+12) // Añadir 12 horas al tiempo actual
    console.log("Login exitoso. Token recibido.");
    return authToken;
  } catch (error) {
    console.error("Error en el login:", error);
    throw error;
  }
}

// Verifica si el token es válido o lo renueva si ha expirado
async function ensureValidToken() {
  if (!authToken || Date.now() >= tokenExpiry) {
    console.log(tokenExpiry);
    console.log("Token expirado o no presente. Realizando login...");
    await login();
  }
}

// Función para hacer peticiones a la API con token actualizado
async function ApiComida(month, day, type) {
  await ensureValidToken();  // Asegura que el token sea válido antes de cada petición

  const url = `https://servicios2.uptc.edu.co/SiRestauranteBackEnd/Menus/menusFechaRestaurante/1/${type}/2024-${month}-${day}`;
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8,zh-TW;q=0.7,zh;q=0.6",
    Authentication: authToken,
    Program: "LchYI/jKSgcZTdYZ3VppnZkBx3fTVchhQg6AhruDu1HLXrEv/6NjJCNjlY2jIpUwg1M8ipkosHsNovSQZjaDJg==",
    UpdateToken: "TsEpyeRh6s1WveQc/2AnPUNVj8KAHu3CilgoZgjxYJeAN187kS2ZysusIOJYjLW8QpCN+bD9lnoPSMKRLguezOeRskCAg4rHBgxdpEsvhSk=",
    User: process.env.API_USERNAME,
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/127.0.0.0 Safari/537.36",
    Origin: "https://apps1.uptc.edu.co",
    "Sec-CH-UA": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Linux"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
      agent: agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en la petición de comida:", error);
    return null;
  }
}

const activeChats = new Set();

async function main() {
  try {
    await login();  // Realizar login al iniciar el servidor

    bot.on("/start", (msg) => {
      activeChats.add(msg.chat.id);
      bot.sendMessage(
        msg.chat.id,
        "Serás notificado diariamente con la comida del día a las 10 a.m. 🤖"
      );
    });

    bot.on("/help", (msg) => {
      bot.sendMessage(
        msg.chat.id,
        "Comandos disponibles:\n\n" +
        "/start - Comienza a recibir notificaciones diarias de la comida a las 10 a.m.\n" +
        "/stop - Deja de recibir notificaciones diarias.\n" +
        "/comida MM/DD - Consulta la comida para una fecha específica (formato MM/DD).\n" +
        "/help - Muestra este mensaje de ayuda."
      );
    });

    bot.on(/^\/comida (\d{2})\/(\d{2})$/, async (msg, props) => {
      const day = props.match[2];
      const month = props.match[1];
      const user = await bot.getChatMember(msg.chat.id, msg.from.id);

      const date = new Date(`2024-${month}-${day}`);
      if (isNaN(date.getTime())) {
        bot.sendMessage(
          msg.chat.id,
          "La fecha especificada no es válida. Por favor, usa el formato MM/DD."
        );
        return;
      }

      try {
        let almuerzo = await ApiComida(month, day, 2);
        let cena = await ApiComida(month, day, 3);

        if ((!almuerzo || !almuerzo.detallesMenus) && (!cena || !cena.detallesMenus)) {
          bot.sendMessage(
            msg.chat.id,
            "No se pudo obtener la información de la comida para la fecha especificada."
          );
          return;
        }

        if (almuerzo && almuerzo.detallesMenus) {
          let comidasAlmuerzo = almuerzo.detallesMenus
            .map(element => `${element.tiposProducto.nombreTipoProducto}: ${element.descripcionIngrediente}`)
            .join("\n\n");

          bot.sendMessage(
            msg.chat.id,
            `Hola ${user.user.first_name}, la comida de almuerzo para ${month}/${day} es: \n\n${comidasAlmuerzo}`,
            { parseMode: "html" }
          );
        }

        if (cena && cena.detallesMenus) {
          let comidasCena = cena.detallesMenus
            .map(element => `${element.tiposProducto.nombreTipoProducto}: ${element.descripcionIngrediente}`)
            .join("\n\n");

          bot.sendMessage(
            msg.chat.id,
            `Hola ${user.user.first_name}, la comida de cena para ${month}/${day} es: \n\n${comidasCena}`,
            { parseMode: "html" }
          );
        }
      } catch (error) {
        bot.sendMessage(
          msg.chat.id,
          `No se pudo obtener la información de la comida. Inténtalo de nuevo más tarde. ${error}`,
        );
      }
    });

    bot.on("/angelarpm", (msg) => {
      bot.sendMessage(msg.chat.id, "Hola Angela, TE AMOOOO 🤖");
    });

    bot.on(/^\/comida$/, (msg) => {
      bot.sendMessage(msg.chat.id, "Por favor, usa el formato correcto: /comida MM/DD. Ejemplo: /comida 08/11");
    });

    bot.on("/stop", (msg) => {
      activeChats.delete(msg.chat.id);
      bot.sendMessage(msg.chat.id, "No recibirás más notificaciones diarias. 🤖");
    });

    bot.on(/^\/pruebaSchedule (.+)$/, (msg, props) => {
      const message = props.match[1];
      const date = new Date();
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");

      let almuerzo = ApiComida(month, day, 2);
      let cena = ApiComida(month, day, 3);

      for (let chatId of activeChats) {
      bot.sendMessage(chatId, `Hola, soy una prueba de notificación programada. Mensaje: ${message}\n\nAlmuerzo: ${almuerzo}\n\nCena: ${cena}`);
      }
    });

    // Notificación programada diaria
    schedule.scheduleJob({ hour: 10, minute: 0 }, async () => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");

      for (let chatId of activeChats) {
        try {
          const user = await bot.getChatMember(chatId, chatId);
          let almuerzo = await ApiComida(month, day, 2);
          let cena = await ApiComida(month, day, 3);

          if (!almuerzo || !almuerzo.detallesMenus) {
            bot.sendMessage(chatId, "No se pudo obtener la información del almuerzo del día.");
          } else {
            let comidasAlmuerzo = almuerzo.detallesMenus
              .map(element => `${element.tiposProducto.nombreTipoProducto}: ${element.descripcionIngrediente}`)
              .join("\n\n");

            bot.sendMessage(
              chatId,
              `Hola ${user.user.first_name}, la comida de almuerzo de hoy es: \n\n${comidasAlmuerzo}`,
              { parseMode: "html" }
            );
          }

          if (!cena || !cena.detallesMenus) {
            bot.sendMessage(chatId, "No se pudo obtener la información de la cena del día.");
          } else {
            let comidasCena = cena.detallesMenus
              .map(element => `${element.tiposProducto.nombreTipoProducto}: ${element.descripcionIngrediente}`)
              .join("\n\n");

            bot.sendMessage(
              chatId,
              `Hola ${user.user.first_name}, la comida de cena de hoy es: \n\n${comidasCena}`,
              { parseMode: "html" }
            );
          }
        } catch (error) {
          console.error("Error enviando notificación:", error);
        }
      }
    });

    bot.start();

    app.listen(process.env.PORT || 3000, () => {
      console.log(`Servidor en funcionamiento en el puerto ${process.env.PORT || 3000}`);
    });

  } catch (error) {
    console.error("Error general:", error);
  }
}

main();