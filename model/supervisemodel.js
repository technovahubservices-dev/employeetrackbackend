

const mongoose = require('mongoose');

const supervisor = new mongoose.Schema({
     name: {
    type: String,
    required: true,

  },
  email: {
    type: String,
   
  },
  message: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('supervisor', supervisor);
