import {BrowserRouter as Router , Routes , Route} from "react-router-dom"
import React from "react";



import LandingPage from "./pages/LandingPage.js";
import LoginPage from "./pages/LoginPage.js";
import CompleteProfile from "./pages/CompleteProfile.js";
import History from "./pages/History/History.js";
import GamePage from "./pages/Game.js";
import Result from "./pages/Result.js";

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<LandingPage/>} /> 
        <Route path="/Login" element={<LoginPage/>} /> 
        <Route path="/Game" element={<GamePage/>} /> 
        <Route path="/History" element={<History/>} /> 
        <Route path="/Result" element={<Result/>} /> 
      

        <Route path="/complete-profile" element={<CompleteProfile/>} /> 

      </Routes>
    </Router>
  );
}

export default App;
