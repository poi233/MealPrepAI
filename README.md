# MealPrepAI - AI Powered Meal Planner

MealPrepAI is a Next.js application designed to help users generate personalized weekly meal plans using artificial intelligence. Users can input their dietary preferences, and the application will generate a 7-day meal plan complete with recipes, ingredients, and instructions. The meal plans are saved to a Vercel Postgres (Neon) database, allowing users to access their previously generated plans.

## Features

- **AI-Powered Meal Plan Generation**: Leverages Genkit and Google's Gemini models to create customized 7-day meal plans.
- **Normalized Meal Plan System**: Clean, efficient meal plan management with proper database relationships.
- **Recipe Management**: Browse and select from a curated collection of sample recipes.
- **Comprehensive Favorites System**: Save recipes with personal ratings (1-5 stars) and notes, detailed favorite views, and organized collections for quick access and meal planning.
- **Interactive Meal Plan Management**:
    - View weekly meal plans in a responsive grid layout.
    - Manually add recipes to any meal slot (breakfast, lunch, dinner, snack).
    - Remove recipes from meal plan slots.
    - Create and manage multiple meal plans.
- **Personalized Dietary Preferences**: Users can specify their dietary needs which influence AI meal generation.
- **Recipe Details Generation**: AI can automatically fill in ingredients and instructions for recipe names.
- **Database Integration**: Normalized database schema with proper relationships for meal plans, recipes, and user favorites.
- **Responsive Design**: Modern UI built with ShadCN UI and Tailwind CSS, optimized for all devices.
- **Profile Management**: Users can save and update their dietary preferences.

## Technologies Used

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, ShadCN UI
- **AI/Backend**: Genkit, Google Gemini Models
- **Database**: Vercel Postgres (powered by Neon)
- **State Management**: React Context API
- **Form Handling**: React Hook Form, Zod for validation

## Multi-Platform Architecture

This Next.js application is part of a comprehensive meal planning ecosystem:

- **Web Application**: This Next.js frontend (current directory)
- **Backend API**: Django REST API (`../MealPrepAppBackend/`)
- **iOS Application**: Native Swift app (`../MealPrepIOSApp/`)

All platforms share the same backend API and maintain consistent data models with flexible parsing for cross-platform compatibility.

## Getting Started

### Prerequisites

- Node.js (version 20 or higher recommended)
- npm or yarn
- Access to a Google AI API key for Gemini models
- A Vercel Postgres (Neon) database instance

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add the following environment variables:

    ```env
    # For Genkit Google AI Plugin
    GOOGLE_API_KEY=your_google_api_key_here

    # For Vercel Postgres (Neon)
    POSTGRES_URL=your_neon_database_url_here
    # Example: postgres://user:password@host:port/database?sslmode=require
    ```
    Replace `your_google_api_key_here` with your actual Google AI API key and `your_neon_database_url_here` with your Vercel Postgres (Neon) connection string.

### Running the Application Locally

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

2.  **Start the Genkit development server (in a separate terminal):**
    This is required for the AI features to work.
    ```bash
    npm run genkit:dev
    # or for watching changes
    npm run genkit:watch
    ```
    The Genkit developer UI will be available at `http://localhost:4000`.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server with Turbopack on port 9002.
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server with file watching.
-   `npm run build`: Builds the Next.js application for production.
-   `npm run start`: Starts the Next.js production server.
-   `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
-   `npm run typecheck`: Runs TypeScript type checking.

## AI Integration with Genkit

This application uses Genkit to interact with Google's Generative AI models (Gemini). Genkit flows are defined in the `src/ai/flows/` directory. These flows handle tasks such as:
- Generating weekly meal plans based on dietary preferences.
- Generating detailed ingredients and instructions for specific recipes.

The Genkit configuration can be found in `src/ai/genkit.ts`. The development server for Genkit (`npm run genkit:dev`) allows for easy testing and monitoring of these AI flows.

## Database

The application uses a normalized database schema with Vercel Postgres (powered by Neon) to store:

- **Users**: User accounts and dietary preferences
- **Recipes**: Sample recipes with ingredients, instructions, and metadata
- **Meal Plans**: Weekly meal plans with proper relationships to recipes
- **User Favorites**: Simple favorites system linking users to their preferred recipes

Database operations are handled through specialized service files:
- `src/lib/meal-plans-db.ts`: Normalized meal plan operations
- `src/lib/services/favorites-service.ts`: Simple favorites management
- `src/lib/sample-recipes.ts`: Recipe data and operations

The database schema is automatically created and managed by the application, with proper foreign key relationships and indexes for optimal performance.

## Project Structure

-   `src/app/`: Contains the Next.js App Router pages and layouts.
-   `src/components/`: Reusable UI components organized by feature.
    -   `src/components/ui/`: ShadCN UI base components.
    -   `src/components/meal-plan/`: Meal planning components with organized subdirectories:
        -   `cards/`: Meal card components (DailyMealCard, MealItemCard)
        -   `dialogs/`: Dialog components (RecipeSelection, AddRecipe, etc.)
    -   `src/components/profile/`: User profile management components.
    -   `src/components/layout/`: Layout components like Header and navigation.
-   `src/ai/`: Genkit AI integration files.
    -   `src/ai/flows/`: AI flow definitions for meal plan and recipe generation.
    -   `src/ai/genkit.ts`: Genkit initialization and configuration.
    -   `src/ai/dev.ts`: Entry point for the Genkit development server.
-   `src/contexts/`: React Context providers for global state management.
    -   `NormalizedMealPlanContext.tsx`: Meal plan state management.
    -   `FavoritesContext.tsx`: Simple favorites system state.
    -   `Providers.tsx`: Combined context providers.
-   `src/hooks/`: Custom React hooks for reusable logic.
-   `src/lib/`: Utility functions and database operations.
    -   `src/lib/meal-plans-db.ts`: Normalized meal plan database operations.
    -   `src/lib/services/`: Service layer for business logic.
        -   `favorites-service.ts`: Simple favorites management.
    -   `src/lib/sample-recipes.ts`: Recipe data and operations.
    -   `src/lib/utils.ts`: General utility functions.
-   `src/types/`: TypeScript type definitions.
    -   `database.types.ts`: Database entity types and interfaces.
-   `public/`: Static assets.
-   Configuration files: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is unlicensed.
```