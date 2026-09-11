const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { PORT, API ,auth_code} = require("./env.js");

const DATA_FILE = path.join("data", "links.json");

const loaddata = async (res, content, filename) => {
    try {
        const data = await fs.readFile(path.join("public", filename));
        res.writeHead(200, {
            "Content-Type": content
        });
        return res.end(data);
    }
    catch (err) {
        res.writeHead(404, {
            "Content-Type": "text/plain"
        });
        console.log(err.message);
        return res.end("404,PAGE NOT FOUND!!!");
    }
};

const storeData = async (data) => {
    await fs.writeFile(DATA_FILE, JSON.stringify(data), 'utf-8');
}

const fetchData = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        if (!data.trim()) {
            return {};
        }
        return JSON.parse(data);
    }
    catch (err) {
        if (err.code == "ENOENT") {
            console.log("File not Found");
            await fs.writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        else throw err;
    }
};

const evalData = async (data) => {
    const formatTime = (timestamp, timezone) => {
        return new Date((timestamp + timezone) * 1000)
            .toISOString()
            .substring(11, 16);
    };

    const sunriseval= formatTime(data.sys.sunrise, data.timezone);
    const sunsetval = formatTime(data.sys.sunset, data.timezone);

    const reqdata = {

        longitude: data.coord.lon,
        latitude: data.coord.lat,

        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,

        temperature: Number((data.main.temp - 273.15).toFixed(2)),
        feelsLike: Number((data.main.feels_like - 273.15).toFixed(2)),
        minTemperature: Number((data.main.temp_min - 273.15).toFixed(2)),
        maxTemperature: Number((data.main.temp_max - 273.15).toFixed(2)),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: Number((data.visibility / 1000).toFixed(2)),
        windSpeed: Number((data.wind.speed * 3.6).toFixed(2)),
        windDirection: data.wind.deg,
        windGust: data.wind.gust
            ? Number((data.wind.gust * 3.6).toFixed(2))
            : 0,
        cloudiness: data.clouds.all,
        rainfall: data.rain?.["1h"] || 0,
        city: data.name,
        country: data.sys.country,
        sunrise: sunriseval,
        sunset: sunsetval
    };

    await storeData(reqdata);
};


const server = http.createServer(async (req, res) => {
    if (req.method === "GET") {
        if (req.url === "/") {
            return await loaddata(res, "text/html", "index.html");
        }
        else if (req.url === "/style.css") {
            return await loaddata(res, "text/css", "style.css")
        }
        else if (req.url === "/weather") {
            return await loaddata(res, "text/html", "weather.html");
        }
        else if (req.url === "/weather.css") {
            return await loaddata(res, "text/css", "weather.css");
        }
        else if (req.url === "/weatherdata") {
            const weather_data = await fetchData();
            res.writeHead(200, {
                "Content-Type": "application/json"
            });
            return res.end(JSON.stringify(weather_data));
        }
    }
    else if (req.method === "POST" && req.url === "/details") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const { city, country } = JSON.parse(body);
            console.log({ city, country });
            storeData({ city, country });
            // const real_country = country.replace(/['"]/g, "").trim();
            const response = await fetch(
                `https://api.restcountries.com/countries/v5?q=${encodeURIComponent(country)}`,
                { headers: { 'Authorization': auth_code } }
            );

            const result = await response.json();
            const countrydata = result.data.objects.find(
                (item) => item.names.common.toLowerCase() === country.toLowerCase()
            );
            const country_code = countrydata.codes.alpha_2;
            console.log(country_code);
            const weatherresponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${country_code}&appid=${API}`);
            const weatherdata = await weatherresponse.json();
            console.log(weatherdata);
            await evalData(weatherdata);

            res.writeHead(200, {
                "Content-Type": "application/json"
            });
            res.end(JSON.stringify({
                success: true,
                message: "Data fetched Successfully"
            }));
        });
    }


});
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
