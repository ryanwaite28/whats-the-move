document.addEventListener('DOMContentLoaded', () => {
    console.log('page loaded.');

    // 

    let you = null;

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in.
            console.log(user);
            you = user;
        } else {
            // No user is signed in.
            console.log('no user');
            you = null;
        }
    });

    // 

    const gLoginButton = document.getElementById('g-login-btn');
    const fbLoginButton = document.getElementById('fb-login-btn');
    const signoutButton = document.getElementById('signout-btn');

    const signInWithProvider = (provider) => {
        return firebase.auth().signInWithPopup(provider).catch(function(error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // The email of the user's account used.
            var email = error.email;
            // The firebase.auth.AuthCredential type that was used.
            var credential = error.credential;
            // ...
            console.log({ error, errorCode, errorMessage, email, credential });
        });
    };

    gLoginButton.addEventListener('click', () => {
        if (!!you) {
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            'display': 'popup'
        });
        signInWithProvider(provider);
    });

    fbLoginButton.addEventListener('click', () => {
        if (!!you) {
            return;
        }
        const provider = new firebase.auth.FacebookAuthProvider();
        provider.setCustomParameters({
            'display': 'popup'
        });
        signInWithProvider(provider);
    });

    signoutButton.addEventListener('click', () => {
        firebase.auth().signOut().then(function() {
            console.log('Signed Out');
        }, function(error) {
            console.error('Sign Out Error', error);
        });
    });
});