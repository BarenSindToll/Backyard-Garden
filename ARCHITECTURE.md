# Backyard Garden — Architecture Overview

## High-level system

```mermaid
flowchart LR
    subgraph Client["fixed-frontend (React + Vite)"]
        Pages["Pages\nHome, GardenLayout, Calendar,\nBlog, Profile, Weather, Admin/*"]
        Components["Components\ngarden-layout/*, permaculture/*,\ncanvas/*"]
        Utils["utils\napi.js, userContext, languageContext"]
        Pages --> Components
        Pages --> Utils
    end

    subgraph Server["fixed-backend (Express, ESM)"]
        Routes["Routes\nauth, user, gardenLayout, plants,\ncalendar, blog, admin, gardenStructure,\nai, permaculture-plans, upload"]
        Middleware["Middleware\nverifyToken, userAuth, adminCheck,\nuploadMiddleware"]
        Controllers["Controllers"]
        Services["Services\npermacultureAiService,\npermacultureContextService"]
        Models["Mongoose Models\nuser, plant, gardenLayout,\ngardenStructure, permaculturePlan,\ncalendar, blogPost"]

        Routes --> Middleware --> Controllers
        Controllers --> Services
        Controllers --> Models
        Services --> Models
    end

    subgraph DB["MongoDB"]
        Collections[(Collections:\nusers, plants, gardenLayouts,\ngardenStructures, permaculturePlans,\ncalendarEvents, blogPosts)]
    end

    subgraph AI["External AI Provider"]
        Anthropic["Anthropic (Claude)"]
    end

    subgraph Mail["Email"]
        SMTP["Nodemailer / SMTP"]
    end

    Utils -- "axios, withCredentials\nhttp://localhost:5173 -> :4000" --> Routes
    Models --> Collections
    Services --> Anthropic
    Controllers -- "verification, reset emails" --> SMTP
    Server -- "static files" --> Uploads[("/uploads")]
```

## Backend module map

```mermaid
flowchart TB
    server["server.js\n(express app, CORS, cookies, DNS)"]

    server --> authRoutes --> authController
    server --> userRoutes --> userController
    server --> gardenLayoutRoutes --> gardenLayoutController
    server --> plantRoutes --> plantController
    server --> calendarRoutes --> calendarController
    server --> blogPostRoutes --> blogPostController
    server --> adminRoutes --> adminController
    server --> gardenStructureRoutes --> gardenStructureController
    server --> aiRoutes --> aiController
    server --> permaculturePlanRoutes --> permaculturePlanController
    server --> uploadRoutes --> uploadMiddleware

    authController --> userModel
    userController --> userModel
    gardenLayoutController --> gardenLayoutModel
    plantController --> plantModel
    calendarController --> calendarModel
    blogPostController --> blogPostModel
    gardenStructureController --> gardenStructureModel
    aiController --> plantModel

    permaculturePlanController --> permaculturePlanModel
    permaculturePlanController --> permacultureContextService
    permaculturePlanController --> permacultureAiService
    permacultureAiService -. "Claude API" .-> ExternalAI[("Anthropic")]
    permacultureContextService --> plantModel
    permacultureContextService --> gardenStructureModel

    config["config/mongodb.js"] --> server
    structureCatalogUtils["utils/structureCatalogUtils.js"] --> gardenStructureController
    structureCatalogUtils --> permacultureContextService
```

## Frontend module map

```mermaid
flowchart TB
    main["main.jsx"] --> App["App.jsx (router)"]

    App --> Header
    App --> Pages

    Pages --> Home
    Pages --> GardenLayout
    Pages --> Calendar
    Pages --> Blog["Blog / SinglePost"]
    Pages --> Profile
    Pages --> Weather
    Pages --> Auth["Signin / Signup / ForgotPassword / ResetPassword / VerifyEmail"]
    Pages --> Admin["admin/* (AdminBlog, AdminProfile, NewBlogPost, EditBlogPost)"]

    GardenLayout --> GardenCanvas
    GardenCanvas --> ZoneCanvas
    GardenCanvas --> RaisedBedZoneCanvas
    GardenCanvas --> OrchardZoneCanvas
    GardenCanvas --> SetupPanel
    GardenCanvas --> ZoneTabs
    GardenCanvas --> BedSidebar
    GardenCanvas --> PlantSidebar
    GardenCanvas --> AddZoneModal
    GardenCanvas --> PlantingModal
    GardenCanvas --> BedEditor
    GardenCanvas --> GenerateGardenModal --> PermaculturePlanWizard
    GardenCanvas --> SiteAnalysisWizard
    GardenCanvas --> ZoneDetailRegistry --> ZoneDetailViews
    GardenCanvas --> canvas["canvas/*\nBedPreviews, CompassRose,\nNeighbourhoodBands, OverlayItem,\nPatternOverlay, StructureVisual, icons"]

    PermaculturePlanWizard --> PermaculturePlanPreview
    PermaculturePlanWizard --> ProposedElementsOverlay

    Admin --> AdminPostEditor

    subgraph Shared["Shared utils/config"]
        api["utils/api.js (axios client)"]
        userContext["utils/userContext.jsx"]
        languageContext["utils/languageContext.jsx"]
        gardenZoneConfig["garden-layout/gardenZoneConfig.js"]
        permaSchema["config/permaculturePlanSchema.js"]
    end

    Pages -.-> Shared
    GardenCanvas -.-> Shared
```

## Notes

- **Auth**: cookie-based JWT (`cookie-parser`, `jsonwebtoken`, `verifyToken`/`userAuth`/`adminCheck` middleware), email verification & password reset via Nodemailer.
- **AI integration**: `permacultureAiService` calls the Anthropic (Claude) API, used by `permaculturePlanController` to generate permaculture plans; `permacultureContextService` builds the context (plants + structures) sent to the LLM.
- **Garden Layout editor**: Konva/`react-konva`-based canvas (`GardenCanvas` + `ZoneCanvas` variants + `canvas/*` visual helpers) for laying out beds, structures, and zones, driven by `gardenZoneConfig.js`.
- **File uploads**: `multer` + `/uploads` static route for images (e.g., blog posts, plant/structure icons).
- **Rich text**: Tiptap/ProseMirror used for blog post editing (`AdminPostEditor`).
