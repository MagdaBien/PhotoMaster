const Photo = require("../models/photo.model");
const Vote = require("../models/vote.model");
const sanitize = require("mongo-sanitize");
const requestIp = require("request-ip");

function isMailCorrect(email) {
  const reg = /^[a-zd]+[wd.-]*@(?:[a-zd]+[a-zd-]+.){1,5}[a-z]{2,6}$/i;
  return reg.test(email);
}

function getIP(req) {
  let usedIP = requestIp.getClientIp(req);
  if (usedIP === "::1" || usedIP === "::ffff:127.0.0.1") {
    usedIP = "127.0.0.1";
  }
  return usedIP;
}

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    const acceptableExtensions = ["jpg", "gif", "png"];
    const maxTitleLength = 25;
    const maxAuthorLength = 50;

    if (title && author && email && file) {
      // if fields are not empty...

      const fileName = file.path.split("/").slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExtension = fileName.split(".").slice(-1)[0];
      const ifExtensionOK = acceptableExtensions.find(
        (ext) => ext === fileExtension.toLowerCase()
      );
      if (
        ifExtensionOK &&
        title.length <= maxTitleLength &&
        author.length <= maxAuthorLength &&
        isMailCorrect(email)
      ) {
        const cleanTitle = sanitize(title);
        const cleanAuthor = sanitize(author);
        const newPhoto = new Photo({
          title: cleanTitle,
          author: cleanAuthor,
          email,
          src: fileName,
          votes: 0,
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error("Wrong input!");
      }
    } else {
      throw new Error("Wrong input!");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: "Not found" });
    else {
      const clientIp = getIP(req); // get user IP
      // check if this uses have already voted;
      const userVotes = await Vote.findOne({ user: clientIp });

      if (userVotes) {
        if (userVotes.votes.find((userVote) => userVote === req.params.id)) {
          // user has already voted on THIS photo
          res.status(500).json(err);
        } else {
          // user voted but on other photo
          userVotes.votes.push(req.params.id);
          photoToUpdate.votes++;
          await photoToUpdate.save();
          console.log("updatedVoter: ", userVotes);
          await userVotes.save();
          res.send({ message: "OK" });
        }
      } else {
        // user not voted on any photo
        photoToUpdate.votes++;
        await photoToUpdate.save();
        const newVoter = new Vote({
          user: clientIp,
          votes: [req.params.id],
        });
        await newVoter.save();
        res.send({ message: "OK" });
      }
    }
  } catch (err) {
    res.status(500).json(err);
  }
};
