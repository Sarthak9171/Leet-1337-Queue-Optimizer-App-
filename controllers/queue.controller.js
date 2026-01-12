const Queue = require("../models/Queue");



const createQueue = async (req, res) => {
  try {
    const { name } = req.body;

    
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Queue name is required",
      });
    }

    
    const businessId = req.user.businessId;

    const queue = await Queue.create({
      name,
      businessId,
    });

    return res.status(201).json({
      success: true,
      message: "Queue created successfully",
      data: queue,
    });
  } catch (error) {
    console.error("Create Queue Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating queue",
    });
  }
};


const getQueues = async (req, res) => {
  try {
    
    const businessId = req.user.businessId;

    const queues = await Queue.find({ businessId });

    return res.status(200).json({
      success: true,
      count: queues.length,
      data: queues,
    });
  } catch (error) {
    console.error("Get Queues Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching queues",
    });
  }
};

const getQueueById = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { businessId } = req.user;

    const queue = await Queue.findOne({
      _id: queueId,
      businessId: businessId
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found"
      });
    }

    res.status(200).json({
      success: true,
      data: queue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch queue",
      error: error.message
    });
  }
};

const joinQueue = async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: "queueId is required",
      });
    }

    const queue = await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      });
    }

    // Initialize counters if missing
    if (!queue.currentToken) queue.currentToken = 0;
    if (!queue.lastIssuedToken) queue.lastIssuedToken = 0;

    // Init if missing
    if (queue.currentServingToken == null) queue.currentServingToken = 0;
    if (!queue.lastIssuedToken) queue.lastIssuedToken = 0;

    // Issue token
    queue.lastIssuedToken += 1;
    await queue.save();

    const position = queue.lastIssuedToken - queue.currentServingToken;


    return res.status(200).json({
      success: true,
      queueId,
      tokenNumber: queue.lastIssuedToken,
      position,
    });
  } catch (error) {
    console.error("Join Queue Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while joining queue",
    });
  }
};

const serveNext = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ success: false, message: "Queue not found" });
    }

    if (queue.currentServingToken == null) {
      queue.currentServingToken = 0;
    }

    if (queue.currentServingToken >= queue.lastIssuedToken) {
      return res.status(200).json({
        success: true,
        message: "Queue completed",
        currentServingToken: null,
      });
    }

    queue.currentServingToken += 1;
    await queue.save();

    return res.status(200).json({
      success: true,
      message: "Next token is now being served",
      currentServingToken: queue.currentServingToken,
    });
  } catch (error) {
    console.error("Serve Next Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while serving next token",
    });
  }
};


const getTokenStatus = async (req, res) => {
  try {
    const { queueId, tokenNumber } = req.params;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      });
    }

    const token = Number(tokenNumber);

    let status = "WAITING";

    if (queue.currentServingToken === token) {
      status = "SERVING";
    } else if (queue.currentServingToken > token) {
      status = "COMPLETED";
    }

    const peopleAhead = Math.max(
      token - (queue.currentServingToken || 0) - 1,
      0
    );

    const avgServeTime = 5; // minutes (temporary, ML later)
    const estimatedWaitTime = peopleAhead * avgServeTime;

    return res.status(200).json({
      success: true,
      tokenNumber: token,
      status,
      peopleAhead,
      currentServingToken: queue.currentServingToken,
      estimatedWaitTime,
    });
  } catch (error) {
    console.error("Get Token Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching token status",
    });
  }
};



module.exports = {
  createQueue,
  getQueues,
  getQueueById,
  joinQueue,
  serveNext,
  getTokenStatus,
};
