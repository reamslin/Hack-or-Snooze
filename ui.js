$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles")
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $editArticleForm = $("#edit-article-form");
  const $ownStories = $("#my-articles");
  const $userProfile = $("#user-profile");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navRight = $('#nav-right');
  const $navLeft = $('#nav-left')
  const $navSubmit = $("#nav-submit");
  const $navUser = $('#nav-user-profile');
  const $navOwn = $('#nav-own');
  const $navFavorites = $('#nav-favorites');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // if a user is not returned, an error returned from the API. Incorrect Username/password
    // show an alert message to the user.
    if (!userInstance) {
      const alertHTML = newAlert('Invalid Username/Password!')
      $loginForm.prepend(alertHTML);
    } else {
      // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    await generateStories();
    loginAndSubmitForm();
    }
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);

    // if a user is not returned, an error was returned from the API. Username already taken.
    if (!newUser) {
      const alertHTML = newAlert('Username Taken!');
      $createAccountForm.prepend(alertHTML);
    } else {

      // set global variable to new user object
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    }
  });

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh
    if (currentUser) {
      // grab the required fields
      let author = $("#author").val();
      let title = $("#title").val();
      let url = $("#url").val();

      // construct a new story object for API
      const newStory = { author, title, url };

      // add story and clear form
      const storyObj = await storyList.addStory(currentUser, newStory);
      const storyHTML = generateStoryHTML(storyObj);

      $allStoriesList.prepend(storyHTML);

      $submitForm.trigger('reset');
      $submitForm.slideToggle();
    }
  })

  $editArticleForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh
    if (currentUser) {
      // grab the required fields
      let author = $("#edit-author").val();
      let title = $("#edit-title").val();
      let url = $("#edit-url").val();
      let storyId = $editArticleForm.data('storyId');

      // construct a story object for API
      const story = { author, title, url };

      // edit story, clear and hide form, generate and show stories
      await storyList.editStory(currentUser, story, storyId);

      $editArticleForm.trigger('reset');
      $editArticleForm.hide();

      await generateStories();
      $allStoriesList.show();

    }
  })

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event Handler for Clicking Submit
   */

  $navSubmit.on("click", async function() {
    hideElements();
    // refresh stories
    await generateStories();
    $allStoriesList.show();
    // show/hide the submit form
    $submitForm.toggle();
  });

   /**
    * Event Handler for Clicking My Favorites 
    */

  $navFavorites.on("click", function() {
    hideElements();
    // show the user's favorite stories
    generateFavorites();
    $favoritedArticles.show();

  })

  /**
   * Event Handler for clicking on My Stories
   */

   $navOwn.on("click", function() {
     hideElements();
     // show the user's own stories
     generateOwnStories();
     $ownStories.show();
   })

   $navUser.on("click", function() {
    hideElements();
    // show the user's profile information
    $userProfile.show();
   })


  /**s
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    // refresh and show stories
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event Handler for favoriting articles
   */

  $("body").on("click", ".star", async function(evt) {
    // only allowed to favorite if user is logged in
    if (currentUser) {
      // retrieve selected story
      const $this = $(evt.target);
      const storyId = $this.parent().attr('id');
      const storyObj = storyList.stories.find((story) => story.storyId === storyId);
      // add/remove story from user's favorites
      currentUser.toggleFavorite(storyObj);
      // switch star icon between solid and outlined
      $this.toggleClass('far fas')
      // if the user is within the favorited articles container, remove the story
      if ($this.parent().parent().attr('id') === 'favorited-articles') {
        $this.parent().remove();
      }
    }
  })

  /**
   * Event Handler for deleting articles
   */

  $("body").on("click", ".trash-can", async function(evt) {
    // deleting only allowed when logged in
    if (currentUser) {
      // retrieve story id and delete from storyList and remove from markup
      const storyId = evt.target.parentElement.id;
      storyList.deleteStory(currentUser, storyId);
      evt.target.parentElement.remove();
    }
  })

  /**
   * Event Handler for editing articles
   */

  $("body").on("click", ".pencil", async function(evt) {
    // editing only allowed when logged in
    if (currentUser) {
      // retrieve story to edit 
      const storyId = evt.target.parentElement.id;
      const storyObj = storyList.stories.find((story) => story.storyId === storyId);
      // set storyId attr in the edit articles form to the story id to edit. 
      // Allows access to the id in the submission callback for the form, without being visible to user.
      $editArticleForm.data('storyId', storyId);
      // load the story's information into the edit article form
      $('#edit-author').val(storyObj.author);
      $('#edit-title').val(storyObj.title);
      $('#edit-url').val(storyObj.url);
      hideElements();
      // show the edit article form
      $editArticleForm.show();

    }
  })
  
  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // update user profile info
    setupUserProfile();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  function generateFavorites() {
    // save user's favorites
    const favorites = currentUser.favorites;
    // clear the stories
    $favoritedArticles.empty();

    // if the user does not have any favorites, show a message
    if (favorites.length === 0) {
      $favoritedArticles.html('You do not have any favorite stories yet! <br> Click a star to add a story to Your Favorites!')
    }

    // generate html for each user favorite stories
    for (let story of favorites) {
      const result = generateStoryHTML(story);
      $favoritedArticles.append(result);
    }
  }

  function generateOwnStories() {
    // save user's own stories 
    const ownStories = currentUser.ownStories;
    // clear the stories
    $ownStories.empty();

    // if the user does not have any stories, show message
    if (ownStories.length === 0) {
      $ownStories.html('You have not submitted any stories yet! <br> Click the Submit tab to add a story!');
    }

    // generate html for each user own stories
    for (let story of ownStories) {
      const result = generateOwnStoryHTML(story);
      $ownStories.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${starClass(story.storyId)} fa-star star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li> 
    `);

    return storyMarkup;
  }

  /**
   * function to determine if the star should be rendered solid or outlined 
   */

  function starClass(storyId) {
    if (currentUser) {
      // solid if it is a user favorite, outlined otherwise
      return currentUser.isFavorite(storyId) ? 'fas' : 'far'
    } else {
      // if not logged in, outlined
      return 'far'
    }
  }

  /**
   * function to generate user's own story 
   */

  function generateOwnStoryHTML(story) {
    // generate regular story HTML
    const storyHTML = generateStoryHTML(story);
    // add delete and edit icons
    storyHTML.prepend($('<i class="fas fa-trash trash-can"></i>'));
    storyHTML.prepend($('<i class="fas fa-edit pencil"></i>'));
    return storyHTML;
  }

  /**
   * function to generate an alert message html 
   */

  function newAlert(msg) {
    return $(`<div class="alert"><i class="fas fa-exclamation-circle" </i> ${msg}</div>`)
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedArticles,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLeft.show();
    $navRight.show();
    $navUser.text(currentUser.username);
  }

  function setupUserProfile() {
    $('#profile-name').append(` ${currentUser.name}`);
    $('#profile-username').append(` ${currentUser.username}`);
    $('#profile-account-date').append(` ${currentUser.createdAt}`)
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
