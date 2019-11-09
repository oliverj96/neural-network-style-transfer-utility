const db = firebase.firestore();
var currentUser;

/**
 * HandleFileSelect Function
 * 
 * Grabs the selected file from the file upload box
 * 
 * @param {*} evt - the file event used to access the file information
 */
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  var file = evt.target.files[0];
  pushFileToFirebase(file);
}

/**
 * PushFileToFirebase Function
 * 
 * Pushes a single file to firebase storage
 * 
 * @param {*} file - the file to push to firebase storage
 */
function pushFileToFirebase(file) {
  var storageRef = firebase.storage().ref('images/' + file.name)

  // Push the file to firebase storage
  // [START oncomplete]
  storageRef.put(file).then(function(snapshot) {
    console.log('Uploaded', snapshot.totalBytes, 'bytes.');
    
    // let's grab the download url
    snapshot.ref.getDownloadURL().then(function(url) {
      addImageToGallery(url);
    });

  }).catch(function(error) {
    // [START onfailure]
    console.error('Upload failed:', error);
    // [END onfailure]
  });
}

/**
 * AddImageToGallery Function
 * 
 * Adds an image to the page utilizing 
 * 
 * @param {*} src 
 */
function addImageToGallery(src) {
  var galleryHTML = document.getElementById("gallery");
  var imgNode = document.createElement("img");
  imgNode.setAttribute("src", src);
  galleryHTML.appendChild(imgNode);
}

function pushNewUserToFirebase(user) {
  db.collection("users").add({
    email: user.email,
    name: user.displayName
  }).then(function(docRef) {
    console.log("Document written with ID: ", docRef.id);
  }).catch(function(error) {
    console.error("Error adding document: ", error);
  });
}

/**
 * DiplayGallery Function
 */
function displayGallery() {
  db.collection("users").where("email", "==", "thatonedraffan@gmail.com").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      // doc.data() is never undefined for query doc snapshots
      console.log(doc.id, " => ", doc.data());
    });
  }).catch(function(error) {
    console.log("Error getting documents: ", error);
  });
}

/**
 * UserExists Function
 * 
 * @param {*} email 
 */
function userExists(email) {
  db.collection("users").where("email", "==", email).get().then(function(doc) {
    if (doc.exists) {
      console.log(doc.id, " => ", doc.data());
      return true;
    } else {
      return false;
    }
  });
}

/**
 * OnLoad Function
 * 
 * Runs when the window is loaded to preform initial setup code such as event listeners.
 */
window.onload = function() {

  // add an event listen to the file selector button
  this.document.getElementById('file').addEventListener('change', handleFileSelect, false);
  this.document.getElementById('galleryBtn').addEventListener('click', this.displayGallery);

  var auth = new firebase.auth.GoogleAuthProvider();

  firebase.auth().useDeviceLanguage();
  firebase.auth().signInWithPopup(auth).then(function(result) {
    // this gives us a Google Access Token for accessing the Google api
    var token = result.credential.accessToken;
    // the signed-in user info
    var user = result.user;

    if (!userExists(user.email)) {
      pushNewUserToFirebase(user);
    }
  }).catch(function(error) {
    // handle errors here
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
  });
}