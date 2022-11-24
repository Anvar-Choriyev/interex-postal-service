const OrderModel = require("./Order");
const OrderItemModel = require("../orderitem/OrderItem");
const PackageModel = require("../package/Package");
const { Op } = require("sequelize");
const catchAsync = require("../../core/utils/catchAsync");
const { validationResult } = require("express-validator");
const AppError = require("../../core/utils/AppError");
const QueryBuilder = require("../../core/utils/QueryBuilder");
const statusOrder = require("../../core/constants/orderStatus");
const statusOrderUz = require("../../core/constants/orderStatusUz");
const priceDelivery = require("../../core/constants/deliveryPrice");
const RegionModel = require("../region/Region");
const DistrictModel = require("../district/District");
const UserModel = require("../user/User");
const statusPackage = require("../../core/constants/packageStatus");
const statusPackageUz = require("../../core/constants/packageStatusUz");
const excelJS = require("exceljs");
const regionsJSON = require("../region/regions.json");
const districtsJSON = require("../district/districts.json");
const Order = require("./Order");
const Tracking = require("../tracking/Tracking");

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const queryBuilder = new QueryBuilder(req.query);
  queryBuilder      
    .filter()
    .paginate()
    .limitFields()
    .search(["recipientPhoneNumber", "recipient"])
    .sort();
  queryBuilder.queryOptions.include = [
    { model: UserModel, as: "storeOwner", attributes: ["storeName"] },
    { model: RegionModel, as: "region", attributes: ["name"] },
    { model: DistrictModel, as: "district", attributes: ["name"] },
  ];
  let allOrders = await OrderModel.findAndCountAll({
    ...queryBuilder.queryOptions,
  });
  allOrders = queryBuilder.createPagination(allOrders);
  res.json({
    status: "success",
    message: "Barcha buyurtmalar",
    error: null,
    data: {
      ...allOrders,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
	const validationErrors = validationResult(req);
	if (!validationErrors.isEmpty()) {
		let err = new AppError("Validatsiya xatosi", 403);
		err.isOperational = false;
		err.errors = validationErrors;
		return next(err);
	}
	const { userRoleUz } = req.user;

	let existedPackage = await PackageModel.findOne({
		where: {
			[Op.and]: [
				{ storeOwnerId: { [Op.eq]: req.user.id } },
				{ packageStatus: { [Op.eq]: statusPackage.STATUS_NEW } },
			],
		},
		order: [["createdAt", "DESC"]],
	});

	if (!existedPackage) {
		existedPackage = await PackageModel.create({ storeOwnerId: req.user.id });
	}
	const storeOwnerId = req.user.id;
	const orders = req.body.orders;
	orders?.forEach(async (order) => {
		const newOrder = await OrderModel.create({
			recipient: order.recipient,
			regionId: order.regionId,
			note: `${userRoleUz}: ${order.note}`,
			recipientPhoneNumber: order.recipientPhoneNumber,
			districtId: order.districtId,
			packageId: existedPackage.id,
			storeOwnerId,
		});
		let items = [];
		let sum = 0;
		order?.orderItems?.forEach((item) => {
			items.push({
				productName: item.productName,
				quantity: item.quantity,
				orderItemTotalPrice: +item.price,
				orderId: newOrder.id,
			});
		});
		items?.forEach((item) => {
			sum += item.orderItemTotalPrice;
		});

		await OrderItemModel.bulkCreate(items);
		newOrder.totalPrice = sum;
		newOrder.packageId = existedPackage.id;
		await newOrder.save();
		existedPackage.packageTotalPrice += newOrder.totalPrice;
		await existedPackage.save();
	});
	res.status(201).json({
		status: "success",
		message: "yangi buyurtmalar qo`shildi",
		errrors: null,
		data: null,
	});
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const orderById = await OrderModel.findByPk(id, {
    include: [
      { model: DistrictModel, as: "district", attributes: ["name"] },
      { model: RegionModel, as: "region", attributes: ["name"] },
      { model: OrderItemModel, as: "items" },
      { model: Tracking, as: "tracking" },
      { model: UserModel, as: "storeOwner", attributes: ["storeName"] },
    ],
  });

  if (!orderById) {
    return next(new AppError("bunday ID order topilmadi", 404));
  }

  res.status(200).json({
    status: "success",
    message: `${orderById.recipient} mijozning buyurtmasi`,
    error: null,
    data: { orderById },
  });
});

exports.changeOrderStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { userRole } = req.user;
  const { orderStatus } = req.body;
  let orderById = await OrderModel.findByPk(id);

  let orderStatusUz;
  orderStatus === statusOrder.STATUS_ACCEPTED
    ? (orderStatusUz = statusOrderUz.STATUS_ADMIN_OLDI)
    : (orderStatusUz = statusOrderUz.STATUS_ADMIN_TOPILMADI);
  if (userRole === "ADMIN") {
    const dprice = orderById.deliveryPrice;
    orderById = await orderById.update({
      orderStatus,
      orderStatusUz,
    });
    if (orderById.orderStatus === statusOrder.STATUS_ACCEPTED) {
      await orderById.update({ deliveryPrice: dprice || 50000 });
    } else {
      await orderById.update({ deliveryPrice: null });
    }
    const existedPackage = await PackageModel.findByPk(orderById.packageId);

    const isNewOrders = await OrderModel.count({
      where: {
        [Op.and]: [
          { packageId: { [Op.eq]: existedPackage.id } },
          { orderStatus: { [Op.eq]: statusOrder.STATUS_REJECTED_DELIVERED } },
        ],
      },
    });
    if (isNewOrders === 0) {
      await existedPackage.update({
        packageStatus: statusPackage.STATUS_OLD,
        packageStatusUz: statusPackageUz.STATUS_ESKI,
      });
    }
  }
  const orderForTracking = await Order.findByPk(id);
  await Tracking.create({
    orderId: id,
    fromStatus: statusOrder.STATUS_NEW,
    toStatus: orderForTracking.orderStatus,
  });
  res.status(203).json({
    status: "success",
    message: "order statusi o`zgardi",
    error: null,
    data: null,
  });
});

exports.adminOrderStatus = catchAsync(async (req, res, next) => {
  let orderStatusVariables = [
    statusOrder.STATUS_ACCEPTED,
    statusOrder.STATUS_NOT_EXIST,
  ];
  res.json(orderStatusVariables);
});

exports.editOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const editOrderbyId = await OrderModel.findOne({
    where: { id: { [Op.eq]: id } },
    attributes: {
      exclude: [
        "createdAt",
        "updatedAt",
        "orderStatus",
        "deliveryPrice",
        "totalPrice",
        "packageId",
      ],
    },
  });

  if (!editOrderbyId) {
    return next(new AppError("bunday buyurtma topilmadi", 404));
  }

  res.json({
    data: editOrderbyId,
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;

  const {
    recipient,
    recipientPhoneNumber,
    regionId,
    districtId,
    orderItems,
    note,
  } = req.body;

  const myPackage = await PackageModel.findOne({
    where: { storeOwnerId: { [Op.eq]: userId } },
  });

  const orderById = await OrderModel.findByPk(id);

  await OrderItemModel.destroy({
    where: { orderId: { [Op.eq]: orderById.id } },
  });
  myPackage.packageTotalPrice -= orderById.totalPrice;
  await myPackage.save();

  await orderById.update({
    recipient,
    recipientPhoneNumber,
    regionId,
    districtId,
    note,
  });
  let items = [];
  let sum = 0;
  orderItems?.forEach((item) => {
    items.push({
      productName: item.productName,
      quantity: item.quantity,
      orderItemTotalPrice: +item.price,
      orderId: orderById.id,
    });
  });
  items.forEach((item) => {
    sum += item.orderItemTotalPrice;
  });

  await OrderItemModel.bulkCreate(items);

  orderById.totalPrice = sum;
  await orderById.save();
  myPackage.packageTotalPrice += orderById.totalPrice;
  await myPackage.save();
  res.status(203).json({
    status: "success",
    message: "buyurtma taxrirlandi",
    error: null,
    data: null,
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  req.query.storeOwnerId = userId;
  const queryBuilder = new QueryBuilder(req.query);
  queryBuilder
    .filter()
    .paginate()
    .limitFields()
    .search(["recipientPhoneNumber", "recipient"])
    .sort();

  queryBuilder.queryOptions.include = [
    { model: DistrictModel, as: "district", attributes: ["name"] },
    { model: RegionModel, as: "region", attributes: ["name"] },
  ];
  let myOrders = await OrderModel.findAndCountAll(queryBuilder.queryOptions);
  myOrders = queryBuilder.createPagination(myOrders);

  res.json({
    status: "success",
    message: `${req.user.firstName} - ${req.user.userRole} ning ro\`yhatdan o\`tkazgan barcha buyurtmalari`,
    error: null,
    data: { ...myOrders },
  });
});

exports.getAllDeliveryPrice = (req, res, next) => {
  const allPrice = Object.values(priceDelivery);
  res.json(allPrice);
};

exports.getAllOrderStatus = (req, res, next) => {
  const { userRole } = req.user;

  let allOrderStatus = [];

  let orderStatus = Object.values(statusOrder);
  let orderStatusUz = Object.values(statusOrderUz);

  if (userRole === "COURIER") {
    orderStatus.slice(4, 12);
    orderStatusUz.slice(4, 12);

    orderStatus?.forEach((_, i) => {
      allOrderStatus.push({
        id: i + 1,
        uz: orderStatusUz[i],
        en: orderStatus[i],
      });
    });
  } else {
    orderStatus?.forEach((_, i) => {
      allOrderStatus.push({
        id: i + 1,
        uz: orderStatusUz[i],
        en: orderStatus[i],
      });
    });
  }
  res.json({
    status: "success",
    message: "All order status",
    data: {
      allOrderStatus,
    },
  });
};
exports.changeDevPrice = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { deliveryPrice } = req.body;

  const existedOrder = await OrderModel.findByPk(id);
  if (!existedOrder) {
    return next(new AppError("Bunday order mavjud emas", 404));
  }
  existedOrder.update({ deliveryPrice: deliveryPrice || 50000 });
  res.json({
    status: "success",
    message: "buyurtma yetkazish to`lovi qo`shildi",
    error: "null",
    data: {
      ...existedOrder,
    },
  });
});

exports.getDeliveredOrders = catchAsync(async (req, res, next) => {
  const { regionId } = req.user;
  const queryBuilder = new QueryBuilder(req.query);
  let deliveredOrders = [];
  let ordersArrInPost = [];

  queryBuilder.queryOptions.include = [
    { model: RegionModel, as: "region", attributes: ["name"] },
    { model: DistrictModel, as: "district", attributes: ["name"] },
  ];

  queryBuilder
    .filter()
    .paginate()
    .limitFields()
    .search(["recipientPhoneNumber", "recipient"])
    .sort();

  const region = await RegionModel.findOne({
    attributes: ["id", "name"],
    where: {
      id: {
        [Op.eq]: regionId,
      },
    },
  });
  const orderStatuses = Object.values(statusOrder).slice(4, 12);
  if (region?.name === "Samarqand viloyati") {
    queryBuilder.queryOptions.where = {
      regionId: {
        [Op.eq]: regionId,
      },
      districtId: {
        [Op.notIn]: [101, 106],
      },
      orderStatus: {
        [Op.in]: orderStatuses,
      },
      ...queryBuilder.queryOptions.where,
    };
    deliveredOrders = await OrderModel.findAndCountAll(
      queryBuilder.queryOptions
    );
    deliveredOrders = queryBuilder.createPagination(deliveredOrders);
    deliveredOrdersArrInPost = deliveredOrders.content.map((order) => {
      return order.dataValues.id;
    });
  } else if (region?.name === "Navoiy viloyati") {
    queryBuilder.queryOptions.where = {
      [Op.or]: {
        regionId: {
          [Op.eq]: regionId,
        },
        districtId: {
          [Op.in]: [101, 106],
        },
      },
      orderStatus: {
        [Op.in]: orderStatuses,
      },
      ...queryBuilder.queryOptions.where,
    };
    deliveredOrders = await OrderModel.findAndCountAll(
      queryBuilder.queryOptions
    );
    deliveredOrders = queryBuilder.createPagination(deliveredOrders);
    ordersArrInPost = deliveredOrders.content.map((order) => {
      return order.dataValues.id;
    });
  } else {
    const orderStatuses = Object.values(statusOrder).slice(4, 12);
    queryBuilder.queryOptions.where = {
      regionId: {
        [Op.eq]: regionId,
      },
      orderStatus: {
        [Op.in]: orderStatuses,
      },
      ...queryBuilder.queryOptions.where,
    };
    deliveredOrders = await OrderModel.findAndCountAll(
      queryBuilder.queryOptions
    );
    deliveredOrders = queryBuilder.createPagination(deliveredOrders);
    ordersArrInPost = deliveredOrders.content.map((order) => {
      return order.dataValues.id;
    });
  }

  res.json({
    status: "success",
    message: "Yetkazib berilgan buyurtmalar",
    error: null,
    data: {
      ...deliveredOrders,
      ordersArrInPost,
    },
  });
});

exports.changeStatusDeliveredOrders = catchAsync(async (req, res, next) => {
	const { regionId, userRoleUz } = req.user;
	const { id } = req.params;
	const { orderStatus, note } = req.body;
	const postOrdersById = await OrderModel.findByPk(id, {
		where: {
			regionId: {
				[Op.eq]: regionId,
			},
		},
	});
	const oldStatus = postOrdersById.orderStatus;
	let orderStatusUz
	orderStatus === statusOrder.STATUS_SOLD ? orderStatusUz = statusOrderUz.STATUS_SOTILDI: ""
	orderStatus === statusOrder.STATUS_PENDING ? orderStatusUz = statusOrderUz.STATUS_KUTILMOQDA: ""
	orderStatus === statusOrder.STATUS_REJECTED ? orderStatusUz = statusOrderUz.STATUS_OTKAZ: ""
	const postOrderStatuses = Object.values(statusOrder).slice(6, 9);
	const postOrderStatusesUz = Object.values(statusOrderUz).slice(6, 9);
	const postOrderStatusChange = postOrderStatuses.find(
		(e) => e === orderStatus
	);
	const postOrderStatusChangeUz = postOrderStatusesUz.find(
		(e) => e === orderStatusUz
	);
	if (
		postOrdersById.orderStatus === "DELIVERED" ||
		postOrdersById.orderStatus === "PENDING"
	) {
		await postOrdersById.update({
			orderStatus: postOrderStatusChange, orderStatusUz: postOrderStatusChangeUz,
			note: `${postOrdersById.dataValues.note} ${userRoleUz}: ${note}`,
		});
	}

	await Tracking.create({
		orderId: id,
		fromStatus: oldStatus,
		toStatus: orderStatus,
	});

	res.status(203).json({
		status: "success",
		message: "Post orderining statusi o'zgardi",
		error: null,
		data: {
			note,
		},
	});
});

exports.getDailyOrders = catchAsync(async (req, res, next) => {
  const { regionId } = req.user;
  const queryBuilder = new QueryBuilder(req.query);
  let ordersOneDay = [];
  let oneDayOrdersArrInPost = [];

  queryBuilder.queryOptions.include = [
    { model: RegionModel, as: "region", attributes: ["name"] },
    { model: DistrictModel, as: "district", attributes: ["name"] },
  ];

  queryBuilder
    .filter()
    .paginate()
    .limitFields()
    .search(["recipientPhoneNumber", "recipient"])
    .sort();

  const region = await RegionModel.findOne({
    attributes: ["id", "name"],
    where: {
      id: {
        [Op.eq]: regionId,
      },
    },
  });

  if (region.name === "Samarqand viloyati") {
    queryBuilder.queryOptions.where = {
      regionId: {
        [Op.eq]: regionId,
      },
      districtId: {
        [Op.notIn]: [101, 106],
      },
      orderStatus: {
        [Op.in]: [statusOrder.STATUS_PENDING, statusOrder.STATUS_DELIVERED],
      },
      ...queryBuilder.queryOptions.where,
    };
    ordersOneDay = await OrderModel.findAndCountAll(queryBuilder.queryOptions);
    ordersOneDay = queryBuilder.createPagination(ordersOneDay);
    oneDayOrdersArrInPost = ordersOneDay.content.map((order) => {
      return order.dataValues.id;
    });
  } else if (region.name === "Navoiy viloyati") {
    queryBuilder.queryOptions.where = {
      [Op.or]: {
        regionId: {
          [Op.eq]: regionId,
        },
        districtId: {
          [Op.in]: [101, 106],
        },
      },
      orderStatus: {
        [Op.in]: [statusOrder.STATUS_PENDING, statusOrder.STATUS_DELIVERED],
      },
      ...queryBuilder.queryOptions.where,
    };
    ordersOneDay = await OrderModel.findAndCountAll(queryBuilder.queryOptions);
    ordersOneDay = queryBuilder.createPagination(ordersOneDay);
    oneDayOrdersArrInPost = ordersOneDay.content.map((order) => {
      return order.dataValues.id;
    });
  } else {
    queryBuilder.queryOptions.where = {
      regionId: {
        [Op.eq]: regionId,
      },
      districtId: {
        [Op.notIn]: [101, 106],
      },
      orderStatus: {
        [Op.in]: [statusOrder.STATUS_PENDING, statusOrder.STATUS_DELIVERED],
      },
      ...queryBuilder.queryOptions.where,
    };
    ordersOneDay = await OrderModel.findAndCountAll(queryBuilder.queryOptions);
    ordersOneDay = queryBuilder.createPagination(ordersOneDay);
    oneDayOrdersArrInPost = ordersOneDay.content.map((order) => {
      return order.dataValues.id;
    });
  }
  res.json({
    status: "success",
    message: "Kunlik yetkazib beriladigan buyurtmalar",
    error: null,
    data: {
      ...ordersOneDay,
      oneDayOrdersArrInPost,
    },
  });
});

exports.exportOrders = catchAsync(async (req, res, next) => {
	const workbook = new excelJS.Workbook();
	const worksheet = workbook.addWorksheet("orders");
	worksheet.columns = [
		{ header: "No", key: "s_no", width: 20 },
		{ header: "Viloyati", key: `regionId`, width: 30 },
		{ header: "Tumani", key: `districtId`, width: 30 },
		{ header: "Telefon raqami", key: "recipientPhoneNumber", width: 20 },
		{ header: "Holati", key: "orderStatusUz", width: 30 },
		{ header: "Yetkazish narxi", key: "deliveryPrice", width: 20 },
		{ header: "Umumiy narxi", key: "totalPrice", width: 20 },
		{ header: "Yaratilgan sana", key: "createdAt", width: 20 },
		{ header: "O'zgartirilgan sana", key: "updatedAt", width: 20 },
		{ header: "Izoh", key: "note", width: 120 },
	];
	const queryBuilder = new QueryBuilder(req.query);
	queryBuilder.filter();
	let downloadOrders = await OrderModel.findAndCountAll(
		queryBuilder.queryOptions
	);
	let regionName = "Barcha viloyatlar"
	let orderDate = ""
	req.query.createdAt ? orderDate = new Date(req.query.createdAt["eq"]).toLocaleString(): ""
	downloadOrders.rows.forEach(order => {
		regionsJSON.forEach(region => {
			if(order.regionId == region.id){
				order.regionId = region.name
			}
			if(req.query.regionId == region.id) {
				regionName = region.name
			}
		})
		districtsJSON.forEach(district => {
			if(order.districtId == district.id) {
				order.districtId = district.name
			}
		})
	}
	)
	const ordersArr = Object.values(downloadOrders.rows.map((e) => e))
	let counter = 1;
	worksheet.addRow()
	ordersArr.forEach((order) => {
		order.s_no = counter;
		worksheet.addRow(order);
		counter++;
	});
	const endRow = worksheet.lastRow._number + 1;
	worksheet.mergeCells(`D${endRow}:E${endRow}`);
	worksheet.getCell(`A2`).value = `${orderDate}`
	worksheet.getCell(`B2`).value = `${regionName}`
	worksheet.mergeCells("C2:J2");
	worksheet.getCell(`D${endRow}`).value = "UMUMIY NARX:";
	worksheet.getCell(`D${endRow}`).alignment = { horizontal: "center" };
	worksheet.getCell(`F${endRow}`).value = { formula: `SUM(F2:F${endRow - 1})` };
	worksheet.getCell(`G${endRow}`).value = { formula: `SUM(H2:H${endRow - 1})` };
	worksheet.eachRow((row) => {
		row.eachCell((cell) => {
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			}
		})
	})
	worksheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true },
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "ffa500" },
		  }
	});
	worksheet.getRow(2).eachCell((cell) => {
		cell.font = { bold: true },
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "aaa9a7" },
		  }
	});
	worksheet.eachRow((row) => {
		row.eachCell((cell) => {
			cell.alignment = {
				horizontal: "center",
			};
		});
	});
	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	);
	res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
	return workbook.xlsx.write(res).then(() => {
		res.status(200).end();
	});
});
