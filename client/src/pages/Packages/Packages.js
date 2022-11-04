import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout/Layout";
import { BasicTable } from "../../components/Table/BasicTable";
import http from "../../utils/axios-instance";
import { Link, useSearchParams } from "react-router-dom";

import styles from "./Packages.module.css";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

function Package() {
  const [packages, setPackages] = useState(null);
  const [pagination, setPagination] = useState({});
  const [searchParams] = useSearchParams();

  const page = searchParams.get("page") || 1;
  const size = searchParams.get("size") || 10;
  useEffect(() => {
    getAllPackages();
  }, [page]);

  const getAllPackages = async () => {
    try {
      const res = await http({
        url: `/packages?page=${page}&size=${size}`,
      });
      setPackages(res.data.data.content);
      setPagination(res.data.data.pagination);
    } catch (error) {}
  };

  const packageCols = [
    {
      id: "No",
      Header: "No",
      accessor: (pack, i) => {
        return `${i + 1}`;
      },
    },
    {
      id: "storeOwner",
      Header: "Package",
      accessor: (pack) => {
        console.log(pack);
        return (
          <Link to={`/packages/${pack.id}/orders`} className={styles.link}>
            {`${pack.storeOwner.firstName} ${pack.storeOwner.lastName}`}
          </Link>
        );
      },
    },
    {
      id: "totalPrice",
      Header: "Package Total Price",
      accessor: "packageTotalPrice",
    },
  ];

  return (
    <Layout>
      {packages?.length > 0 ? (
        <BasicTable
          columns={packageCols}
          data={packages}
          url="packages"
          pagination={pagination}
        />
      ) : (
        <p>Malumotlar yoq</p>
      )}
    </Layout>
  );
}

export default Package;
