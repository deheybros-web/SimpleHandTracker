const isLoggedIn = localStorage.getItem("loggedIn");

        if (isLoggedIn !== "true") {
            window.location.href = "./index.html";
        }

const logOut = document.getElementById("logoutBtn");

logOut.addEventListener("click", 
function() {
    localStorage.setItem("loggedIn", false);
    window.location.href = "./index.html";
}
)
