import axios from "axios";
const token = localStorage.getItem("token");

export default axios.create({
  baseURL: "http://localhost:8080/api/v1/",
  headers: {
    authorization: `Bearer ${token}`,
  },
});
