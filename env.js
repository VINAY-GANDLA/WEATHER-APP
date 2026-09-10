const PORT = isNaN(process.env.port) ? 3000 : parseInt(process.env.port);
const API = process.env.WEATHER_API;
const auth_code = process.env.auth_code;
module.exports = { PORT, API ,auth_code};
