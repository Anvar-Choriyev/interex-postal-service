const router = require("express").Router();
const roleMiddleware = require("../../core/middlewares/roleMiddleware");
const orderControllers = require("./orderControllers");
const orderValidator = require("./orderExpressValidator");

router
	.route("/")
	.get(roleMiddleware(["ADMIN", "SUPER_ADMIN"]), orderControllers.getAllOrders)
	.get(roleMiddleware(["ADMIN"]), orderControllers.adminOrderStatus)
	.post(
		roleMiddleware(["STORE_OWNER"]),
		orderValidator.creatingOrderValidator,
		orderControllers.createOrder
	);
router.get("/download", orderControllers.exportOrders)
router
	.get("/delivered", orderControllers.getDeliveredOrders) 
	.get("/delivered/daily", orderControllers.getDailyOrders)
	.put("/delivered/:id/status", orderControllers.changeStatusDeliveredOrders) 
router
	.route("/myorders")
	.get(roleMiddleware(["STORE_OWNER"]), orderControllers.getMyOrders)
router
	.route("/status")
	.get(orderControllers.getAllOrderStatus)
router
	.route("/devprice")
	.get(orderControllers.getAllDeliveryPrice);
router
	.route("/:id")
	.get(orderControllers.getOrderById)
	.put(roleMiddleware(["STORE_OWNER"]),
		orderValidator.updatedOrderValidator, orderControllers.updateOrder)
	.patch(
		roleMiddleware(["ADMIN"]),
		orderControllers.changeOrderStatus
	);
router
	.route("/:id/edit")
	.get(orderControllers.editOrder)

	router.route("/:id/devprice").patch(roleMiddleware(["ADMIN"]), orderControllers.changeDevPrice)

module.exports = router;
