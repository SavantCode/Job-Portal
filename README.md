# Job Portal Web Application (MERN Stack)

A modern, responsive, and full-stack Job Portal web application built with the MERN stack. Designed to bridge the gap between job seekers and employers with features like role-based workflows, advanced job filtering, bookmarking, and cloud media handling.

---

## Tech Stack

* **Frontend:** React.js (Vite), Redux Toolkit, Tailwind CSS, Shadcn/UI, Lucide React, React Router
* **Backend:** Node.js, Express.js, Mongoose ODM, JWT Authentication
* **Database:** MongoDB Atlas / Local MongoDB
* **Cloud & Storage:** Cloudinary (for profile avatars, company logos, and resumes)

---
<img width="1920" height="1080" alt="Screenshot (2278)" src="https://github.com/user-attachments/assets/a7d4773c-756e-4a9a-ab26-e458b8dd2895" />
<img width="1920" height="1080" alt="Screenshot (2281)" src="https://github.com/user-attachments/assets/0e91cc60-373a-494d-9249-90c79ad75e30" />


##  Key Features

* **Authentication & Authorization:** Secure JWT-based authentication stored via HTTP cookies with role-based access control.
* **Job Management:** Admins can post structured jobs with validated inputs, dropdown selections, and automatic form-state persistence via `localStorage`.
* **Advanced Search & Filtering:** Filter jobs by keywords, locations, categories, and salary ranges.
* **Bookmark / Save for Later:** Users can save jobs, instantly synchronized with global Redux state and persistent backend data.
* **Media Optimization:** Seamless image and file uploads powered by Cloudinary.

---

## Project Structure

```text
job-portal-project/
├── backend/
│   ├── controllers/      # Route logic & controllers
│   ├── models/           # Mongoose schemas (User, Job, Company, Application)
│   ├── routes/           # Express routers
│   ├── middlewares/      # Auth & file upload middleware
│   └── index.js          # App entry point
│
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── redux/        # Redux slices (auth, job, company)
    │   ├── utils/        # Constants & helper functions
    │   └── App.jsx       # Root router component
    └── package.json
```

---

## ⚙️ Getting Started & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/job-portal-project.git
cd job-portal-project
```

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and configure environment variables:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_jwt_secret_key

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

---
