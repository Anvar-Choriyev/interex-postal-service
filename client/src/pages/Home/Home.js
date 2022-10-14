import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout/Layout";
import AppContext from "../../context/AppContext";
import http from "../../utils/axios-instance";

import styles from "./Home.module.css";

function Home() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const logoutHandle = () => {
    localStorage.clear();
    ctx.onReset();
    http({
      headers: {
        authorization: "",
      },
    });
    navigate("/");
  };

  return (
    <Layout>
      <div>
        <Link to="/users">Users</Link>
        <Link to="/orders">Orders</Link>
        <h1 className={styles.h1}>Welcome to the Interex.uz portal</h1>
        <h2 onClick={logoutHandle} className={styles.logout}>
          Log Out
        </h2>
      </div>
    </Layout>
  );
}

export default Home;
