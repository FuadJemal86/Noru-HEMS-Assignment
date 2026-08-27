import axios, { CanceledError } from "axios";

const isDevelopment = import.meta.env.MODE === "development";
const api = axios.create({
  baseURL: isDevelopment
    ? "http://localhost:4000/api" : "DEPLOYMENT SERVER URL",
  withCredentials: true,
});

const nPoint = isDevelopment
  ? "http://localhost:4000/" : "DEPLOYMENT SERVER URL"

export default api;
export { CanceledError, nPoint };