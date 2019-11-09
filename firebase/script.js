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
  console.log("File to Upload: " + file);
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
      // and attach that image url to the user's firestore
      attachImageToUser(url);
    });

  }).catch(function(error) {
    // [START onfailure]
    console.error('Upload failed:', error);
    // [END onfailure]
  });
}

/**
 * 
 * 
 * @param {*} src 
 */
function attachImageToUser(src) {
  db.collection("users").doc(currentUser.email).collection("images").add({
    image: src
  }).then(function() {
    console.log("Document written with user ID: ", currentUser.email);
  }).catch(function(error) {
    console.error("Error adding document: ", error);
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

/**
 * PushNewUserToFirebase Function
 * 
 * @param {*} user 
 */
function pushNewUserToFirebase(user) {
  db.collection("users").doc(user.email).set({
    name: user.displayName
  }).then(function() {
    console.log("Document written with ID: ", user.email);
  }).catch(function(error) {
    console.error("Error adding document: ", error);
  });
}

/**
 * DiplayGallery Function
 */
function displayGallery() {
  db.collection("users").doc(currentUser.email).collection("images").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      // doc.data() is never undefined for query doc snapshots
      console.log(doc.id, " => ", doc.data());
      addImageToGallery(doc.data().image);
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
function userExists(user) {
  var exists = db.collection("users").doc(user.email).get().then(function(doc) {
    if (!doc.exists) pushNewUserToFirebase(user);
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
    currentUser = user;

    // check to see if the user is already in our Firestore
    // if they are not, then we need to add them
    // we store userdata in Firestore to enable picture references
    // to be linked with a specific user
    userExists(user);
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