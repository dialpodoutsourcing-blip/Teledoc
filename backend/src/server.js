require('dotenv').config();

const app = require('./index');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\nTelemedicine server running on http://localhost:${PORT}`);
  console.log('REST API ready\n');
});
