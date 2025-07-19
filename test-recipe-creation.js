// Simple test script to create a recipe via API
const testRecipe = {
  name: "Test Spaghetti Carbonara",
  description: "A test recipe created via API",
  ingredients: [
    { name: "Spaghetti", amount: 100, unit: "g" },
    { name: "Pancetta", amount: 50, unit: "g" },
    { name: "Eggs", amount: 2, unit: "pieces" },
    { name: "Parmesan cheese", amount: 30, unit: "g" }
  ],
  instructions: "1. Cook spaghetti. 2. Fry pancetta. 3. Mix with eggs and cheese.",
  mealType: "dinner",
  prepTime: 10,
  cookTime: 20,
  difficulty: "medium",
  tags: ["pasta", "italian"]
};

fetch('http://localhost:9002/api/recipes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testRecipe)
})
.then(response => response.json())
.then(data => console.log('Recipe created:', data))
.catch(error => console.error('Error:', error));