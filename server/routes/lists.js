const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  uploadAndDistribute,
  getDistributedLists,
  getAgentLists
} = require('../controllers/listController');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, XLSX, and XLS files are allowed'));
    }
  }
});

// All routes are protected
router.use(auth);

// POST /api/lists/upload
router.post('/upload', upload.single('file'), uploadAndDistribute);

// GET /api/lists
router.get('/', getDistributedLists);

// GET /api/lists/agent/:agentId
router.get('/agent/:agentId', getAgentLists);

module.exports = router;