import axios, { CanceledError } from "axios";

const isDevelopment = import.meta.env.MODE === "development";
const api = axios.create({
  baseURL: isDevelopment
    ? "http://localhost:4000/api" : "https://noru-hems-assignment.onrender.com/api",
  withCredentials: true,
});

const nPoint = isDevelopment
  ? "http://localhost:4000/" : "https://noru-hems-assignment.onrender.com"

export default api;
export { CanceledError, nPoint };