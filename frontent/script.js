const BASE_URL = window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503");
window.BASE_URL = BASE_URL;

// ----------------------------
// Show Login Form
// ----------------------------
function showLogin() {
    document.getElementById("registerCard").style.display = "none";
    document.getElementById("loginCard").style.display = "block";
}

// ----------------------------
// Show Register Form
// ----------------------------
function showRegister() {
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("registerCard").style.display = "block";
}

// ----------------------------
// Register User
// ----------------------------
async function register() {

    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const bio = document.getElementById("regBio").value;

    try {

        const response = await fetch(BASE_URL + "/api/users/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                email,
                password,
                bio
            })

        });

        const data = await response.json();

        alert(data.message);

        if (response.ok) {

            // Clear form
            document.getElementById("regUsername").value = "";
            document.getElementById("regEmail").value = "";
            document.getElementById("regPassword").value = "";
            document.getElementById("regBio").value = "";

            // Show login form
            showLogin();
        }

    } catch (error) {

        console.log(error);
        alert("Server Error");

    }

}

// ----------------------------
// Login User
// ----------------------------
async function login() {

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {

        const response = await fetch(BASE_URL + "/api/users/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })

        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            alert("Login Successful!");

            window.location.href = "home.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.log(error);
        alert("Server Error");

    }

}