import {HashRouter as Router , Routes , Route} from "react-router-dom"
import React from "react";



import LandingPage from "./pages/LandingPage.js";
import LoginPage from "./pages/LoginPage.js";
import CompleteProfile from "./pages/CompleteProfile.js";
import TicketHistory from "./pages/History/History.js";
import Game from "./pages/Game.js"
import LiveDrawPage from "./pages/LiveDraw/LiveDrawPage.js";
import DrawsPage from "./pages/allDraws/DrawsPage.js";



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage/>} /> 
        <Route path="/Login" element={<LoginPage/>} /> 
        <Route path="/LiveDraw" element={<LiveDrawPage/>} /> 
        <Route path="/History" element={<TicketHistory/>} /> 
        <Route path="/Game" element={<Game/>} /> 
        <Route path="/complete-profile" element={<CompleteProfile/>} />
        <Route path="/AllDraws" element={<DrawsPage/>} /> 

      </Routes>
    </Router>
  );
}

export default App;
