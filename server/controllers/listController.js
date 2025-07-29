const csv = require('csv-parser');
const fs = require('fs');
const XLSX = require('xlsx');
const Agent = require('../models/Agent');
const DistributedList = require('../models/DistributedList');

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Parse Excel file
const parseExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error('Error parsing Excel file');
  }
};

// Validate data format
const validateData = (data) => {
  const errors = [];
  
  data.forEach((item, index) => {
    // Check for required fields (case-insensitive)
    const firstName = item.FirstName || item.firstname || item.FIRSTNAME;
    const phone = item.Phone || item.phone || item.PHONE;
    
    if (!firstName) {
      errors.push(`Row ${index + 1}: FirstName is required`);
    }
    if (!phone) {
      errors.push(`Row ${index + 1}: Phone is required`);
    }
    
    // Validate phone number (basic validation)
    if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
      errors.push(`Row ${index + 1}: Invalid phone number format`);
    }
  });
  
  return errors;
};

// Distribute items among agents
const distributeItems = (items, agents) => {
  const itemsPerAgent = Math.floor(items.length / agents.length);
  const remainder = items.length % agents.length;
  
  const distributions = [];
  let currentIndex = 0;
  
  agents.forEach((agent, agentIndex) => {
    const itemsForThisAgent = itemsPerAgent + (agentIndex < remainder ? 1 : 0);
    const agentItems = items.slice(currentIndex, currentIndex + itemsForThisAgent);
    
    distributions.push({
      agent: agent._id,
      items: agentItems.map((item, itemIndex) => ({
        firstName: item.FirstName || item.firstname || item.FIRSTNAME,
        phone: item.Phone || item.phone || item.PHONE,
        notes: item.Notes || item.notes || item.NOTES || '',
        originalIndex: currentIndex + itemIndex
      }))
    });
    
    currentIndex += itemsForThisAgent;
  });
  
  return distributions;
};

// Upload and distribute list
const uploadAndDistribute = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, path: filePath } = req.file;
    const fileExtension = originalname.split('.').pop().toLowerCase();

    // Validate file type
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      fs.unlinkSync(filePath); // Clean up uploaded file
      return res.status(400).json({ message: 'Only CSV, XLSX, and XLS files are allowed' });
    }

    // Parse file based on extension
    let data;
    try {
      if (fileExtension === 'csv') {
        data = await parseCSV(filePath);
      } else {
        data = parseExcel(filePath);
      }
    } catch (parseError) {
      fs.unlinkSync(filePath); // Clean up uploaded file
      return res.status(400).json({ message: 'Error parsing file. Please check file format.' });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Validate data
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'File is empty or invalid' });
    }

    const validationErrors = validateData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Data validation failed',
        errors: validationErrors
      });
    }

    // Get active agents (limit to 5 as per requirement)
    const agents = await Agent.find({ isActive: true }).limit(5);
    if (agents.length === 0) {
      return res.status(400).json({ message: 'No active agents found. Please add agents first.' });
    }

    // Distribute items among agents
    const distributions = distributeItems(data, agents);

    // Save distributions to database
    const savedDistributions = [];
    for (const distribution of distributions) {
      const distributedList = new DistributedList({
        agent: distribution.agent,
        items: distribution.items,
        uploadedBy: req.user.id
      });
      await distributedList.save();
      savedDistributions.push(distributedList);
    }

    res.json({
      success: true,
      message: 'File uploaded and distributed successfully',
      totalItems: data.length,
      agentsCount: agents.length,
      distributions: savedDistributions.map(dist => ({
        agentId: dist.agent,
        itemsCount: dist.items.length
      }))
    });

  } catch (error) {
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload and distribute error:', error);
    res.status(500).json({ message: 'Server error during file processing' });
  }
};

// Get distributed lists
const getDistributedLists = async (req, res) => {
  try {
    const distributedLists = await DistributedList.find()
      .populate('agent', 'name email')
      .populate('uploadedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, distributedLists });
  } catch (error) {
    console.error('Get distributed lists error:', error);
    res.status(500).json({ message: 'Server error while fetching distributed lists' });
  }
};

// Get lists for specific agent
const getAgentLists = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const agentLists = await DistributedList.find({ agent: agentId })
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, agentLists });
  } catch (error) {
    console.error('Get agent lists error:', error);
    res.status(500).json({ message: 'Server error while fetching agent lists' });
  }
};

module.exports = {
  uploadAndDistribute,
  getDistributedLists,
  getAgentLists
};