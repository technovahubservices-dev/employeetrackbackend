import Profile from '../model/profile';

// Save profile data
export async function saveProfile(req, res) {
  try {
    const { name, phone, email, location } = req.body;
    let imagePath = null;

    if (req.file) {
      imagePath = req.file.path; // multer stores file path
    }

    if (!name || !phone || !email || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const profile = new Profile({
      name,
      phone,
      email,
      location,
      image: imagePath
    });

    await profile.save();

    res.status(201).json({ message: "Profile saved successfully", profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
}
