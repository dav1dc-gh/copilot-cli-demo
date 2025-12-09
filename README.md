# copilot-cli-demo
A Place for Copilot CLI Demos

## Feedback Form Application

A simple Node.js-based feedback form using Express.js.

### Features

- Clean and responsive UI
- Form validation
- Real-time feedback submission
- In-memory storage of feedback entries
- View all submitted feedback via API endpoint

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

The application will start on `http://localhost:3000`

### Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Fill in the feedback form with:
   - Your name
   - Your email
   - A rating (1-5)
   - Your comments
3. Click "Submit Feedback"

### API Endpoints

- `GET /` - Serves the feedback form
- `POST /submit-feedback` - Submits feedback (expects JSON with name, email, rating, comments)
- `GET /feedback` - Returns all submitted feedback in JSON format

### Project Structure

```
.
├── server.js           # Express server and API endpoints
├── public/
│   ├── index.html      # Feedback form HTML
│   ├── styles.css      # Styling
│   └── script.js       # Client-side JavaScript
├── package.json        # Project dependencies
└── README.md          # This file
```
