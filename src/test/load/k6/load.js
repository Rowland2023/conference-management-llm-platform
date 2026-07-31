import http from "k6/http";

export const options = {

    vus: 500,

    duration: "5m",

};

export default function () {

    http.get(
        "http://localhost:3000/health"
    );

}