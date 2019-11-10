const db = firebase.firestore(); // accessable instance variable for Firebase Firestore
var currentUser; // the currently connected user

/**
 * Writes an image to the viewable HTML page using a given downloaded source URL
 * from Firebase Storage
 * @param {string} src - Firebase Storage download URL for an image
 */
function addImageToGallery(src, i) {
    var imgNode = document.createElement("img");
    imgNode.setAttribute("id", "galleryImage");
    imgNode.setAttribute("src", src);
    galleryCol = document.getElementById("galleryCol" + i);
    galleryCol.appendChild(imgNode);
  }

/**
 * Pulls all the images assigned to a user from Firestore and calls for the images 
 * to be written to the viewable HTML page
 */
function displayGallery() {
  var i = 0;
  db.collection("users").doc(currentUser.email).collection("images").get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      // doc.data() is never undefined for query doc snapshots
      console.log(doc.id, " => ", doc.data());
      addImageToGallery(doc.data().image, i);
      if (i++ >= 3) {
        i = 0;
      }
    });
  }).catch(function (error) {
    console.log("Error getting documents: ", error);
  });
}

/**
 * Checks to see if a given user has an document in the Firestore users collection and if no,
 * creates a new document for them
 * @param {object} user - User JS object retrieved from the Google login API
 */
function userExists(user) {
  var exists = db.collection("users").doc(user.email).get().then(function (doc) {
    if (!doc.exists) pushNewUserToFirebase(user);
  });
}

/**
 * Runs when the window is loaded to preform initial setup code such as event listeners.
 */
window.onload = function () {
  var providerGoogle = new firebase.auth.GoogleAuthProvider(); // login with Google

  firebase.auth().useDeviceLanguage();
  firebase.auth().signInWithPopup(providerGoogle).then(function (result) {

    // this gives us a Google Access Token for accessing the Google API
    var token = result.credential.accessToken;

    // save the signed-in user info
    currentUser = result.user;

    // check to see if the user is already in our Firestore
    // if they are not, then we need to add them
    // we store userdata in Firestore to enable picture references
    // to be linked with a specific user
    userExists(currentUser);
    displayGallery();
  }).catch(function (error) {

    // handle errors here
    var errorCode = error.code;
    var errorMessage = error.message;

    // The email of the user's account used.
    var email = error.email;

    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
  });
}