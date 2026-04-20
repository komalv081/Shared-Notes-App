const User = require("../models/user");
const bcrypt = require("bcryptjs");

//Resgister Api
exports.register = async (req ,res)=>{

    try{
        const {name ,email,password}= req.body; //read from request body

        //check if user exists
        const userExists = await User.findOne({email}); // check if user already exists
        if (userExists){
            return res.status(400).json({message:"User already exists"});
        }
        //hash password
        const hashedPassword = await bcrypt.hash(password,10);

        //create user in mongoDB
        const user = await User.create({
            name ,
            email,
            password : hashedPassword
        });
        res.json({
            message: " User registered Successfully",
            user
        });
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
};
const jwt = require("jsonwebtoken");

// LOGIN API
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4. send response
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};