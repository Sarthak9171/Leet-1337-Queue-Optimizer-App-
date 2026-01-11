const Queue = require("../models/Queue");
const QueueEntry = require("../models/QueueEntry");



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

    // Issue new token
    queue.lastIssuedToken += 1;
    await queue.save();

    const position = queue.lastIssuedToken - queue.currentToken;

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

  const { queueId } = req.params;

  const queue = await Queue.findById(queueId);
  if (!queue) {
    return res.status(404).json({ message: "Queue not found" });
  }

  const currentServing = await QueueEntry.findOne({
    queueId,
    status: "serving",
  });

  if (currentServing) {
    currentServing.status = "completed";
    await currentServing.save();
  }

  const nextEntry = await QueueEntry.findOne({
    queueId,
    status: "waiting",
  }).sort({ tokenNumber: 1 });

  if (!nextEntry) {
    queue.currentServingToken = null;
    await queue.save();

    return res.json({
      message: "Queue completed",
      currentServingToken: null,
    });
  }

  nextEntry.status = "serving";
  await nextEntry.save();

  queue.currentServingToken = nextEntry.tokenNumber;
  await queue.save();

  res.json({
    message: "Next token is now being served",
    currentServingToken: nextEntry.tokenNumber,
  });
};

const getTokenStatus = async (req, res) => {
  try {
    const { queueId, tokenNumber } = req.params;

    // 1. Find the token entry
    const entry = await QueueEntry.findOne({
      queueId,
      tokenNumber: Number(tokenNumber),
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // 2. Find queue
    const queue = await Queue.findById(queueId);

    // 3. Count people ahead
    const peopleAhead = await QueueEntry.countDocuments({
      queueId,
      status: "waiting",
      tokenNumber: { $lt: Number(tokenNumber) },
    });

    // 4. Temporary wait time logic (ML later)
    const avgServeTime = 5; // minutes
    const estimatedWaitTime = peopleAhead * avgServeTime;

    // 5. Response
    return res.status(200).json({
      success: true,
      tokenNumber: Number(tokenNumber),
      status: entry.status,
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
