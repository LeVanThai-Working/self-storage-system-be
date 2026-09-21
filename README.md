- - Workflows contributing code:

- First time cloning project:

* npx husky init --> (init Husky)
* npm install --> (install dependencies)
* npm run format --> (format codebase)
* npm run check --> (check type, eslint, format)

- On each task:

* npm run dev --> (dev phase)
* npm run build --> (Compile TS -> JS)
* npm start --> (run code had built)

- - Git rules:
- Branch naming conventions:

* feature/branch-name --> (application feature)
* fix/branch-name --> (fix appliction bugs)
* hotfix/branch-name --> (fix critical issues)
* chore/branch-name --> (config, chores, docs, ...)
* refactor/branch-name --> (refactor code structure)

- Commit conventions:

* [PREFIX] (feature): short description here...
* - [PREFIX]: FEATURE, CHORE, FIX, HOTFIX, REFACTOR
* - (feature): feature's name, such as: (auth, user, payment,...)
* - short description: describe short action in that commit, such as: (completed CRUD, ...)
* Example of one commit: -- [CHORE] (auth): config jwt guards --

-- Docker

- `docker compose up -d` -> create image + start container for the redis
- `docker compose stop` -> stop the container which is running
- `docker compose logs` -> view output from containers
- `docker compose down` -> remove the container which is running
