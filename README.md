# FairResolve - AI-based Dispute Resolver

A React.js platform for resolving conflicts fairly using AI mediation.

## Features

- **Authentication**: Secure login/register with Firebase.
- **Dispute Management**: Create disputes, invite other parties, and track status.
- **Real-time Chat**: Two-party communication powered by Firestore.
- **AI Mediation**: Artificial Intelligence analyzes statements and suggests resolutions (Mocked integration).
- **Admin Panel**: Monitor disputes and abuse.
- **Evidence Upload**: Secure file storage for documents and images.

## Setup Instructions

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory with your Firebase configuration keys:
    ```
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Project Structure

- `src/components`: UI components (Button, Card, Input) and Layouts.
- `src/pages`: Application views (Home, Dashboard, DisputeDetails, etc.).
- `src/services`: Firebase configuration and AI service simulations.
- `src/contexts`: Authentication state management.
