import axios, { CanceledError } from "axios";

const isDevelopment = import.meta.env.MODE === "development";
const api = axios.create({
  baseURL: isDevelopment
    ? "http://localhost:4000/api"
    : "https://usify.stockwise.store/api",
  withCredentials: true,
});

const nPoint = isDevelopment
  ? "http://localhost:4000/"
  : "https://usify.stockwise.store/";

export default api;
export { CanceledError, nPoint };