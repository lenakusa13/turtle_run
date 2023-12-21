const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Function to read scores from the file
function readScores() {
    const data = fs.readFileSync('scores.json', 'utf8');
    return JSON.parse(data);
}

// Function to write scores to the file
function writeScores(scores) {
    fs.writeFileSync('scores.json', JSON.stringify(scores, null, 2), 'utf8');
}

// Route to get high scores
app.get('/highscores', (req, res) => {
    const scores = readScores();
    res.json(scores);
});

// Route to submit a high score
app.post('/submit', (req, res) => {
    const { name, level, seagulls } = req.body;
    const scores = readScores();

    if (!scores[name] || level > scores[name].level || seagulls > scores[name].seagulls) {
        scores[name] = { level, seagulls };
        writeScores(scores);
    }

    res.json({ message: 'Score submitted successfully.' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
