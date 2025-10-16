export interface Translations {
    appTitle: string;
    // Language Settings
    l1Label: string;
    l2Label: string;
    autoDetect: string;
    auto: string;
    detecting: string;
    currentConfig: string;

    // Text Reader
    loadSampleText: string;
    loadButton: string;
    loadingText: string;
    plainView: string;
    markdownView: string;
    instructions: string;
    instructionsText: string;
    dontShowAgain: string;
    characters: string;
    writeOrPasteText: string;

    // Phrase Selector
    selectPhrase: string;
    selectedText: string;
    phrase: string;
    editPhrasePlaceholder: string;
    context: string;
    contextPlaceholder: string;
    translation: string;
    translationPlaceholder: string;
    cancel: string;
    savePhrase: string;
    phraseEmpty: string;
    phraseSaved: string;

    // Sample Text
    sampleTitle: string;
    sampleSubtitle: string;
    sampleContent: string;
    sampleText: string;

    // UI Elements
    reading: string;
    dictionary: string;
    learning: string;
    light: string;
    dark: string;
}

export const translations: Record<string, Translations> = {
    en: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Detecting...",
        currentConfig: "English → Spanish",
        loadSampleText: "Load Sample Text",
        loadButton: "Load",
        loadingText: "Loading...",
        plainView: "Plain View",
        markdownView: "Markdown View",
        instructions: "Instructions:",
        instructionsText:
            "Select text to create phrases. You can load sample text or write your own text.",
        dontShowAgain: "Don't show this again",
        characters: "characters",
        writeOrPasteText: "Write or paste your text here...",
        selectPhrase: "Select Phrase",
        selectedText: "Selected text",
        phrase: "Phrase:",
        editPhrasePlaceholder: "Edit phrase if necessary",
        context: "Context (optional):",
        contextPlaceholder: "Add additional context...",
        translation: "Translation (optional):",
        translationPlaceholder: "English translation...",
        cancel: "Cancel",
        savePhrase: "Save Phrase",
        phraseEmpty: "The phrase cannot be empty",
        phraseSaved: "has been saved to your dictionary",
        sampleTitle: "My Trip to Spain",
        sampleSubtitle: "My First Week in Madrid",
        sampleContent:
            "Hello, my name is María and I'm from Mexico. Last year I decided to travel to Spain to improve my Spanish and learn about Spanish culture.",
        sampleText: `# My Trip to Spain

Hello, my name is María and I'm from Mexico. Last year I decided to travel to Spain to improve my Spanish and learn about Spanish culture.

## My First Week in Madrid

When I arrived in Madrid, I felt a bit nervous because I didn't know anyone. However, the people were very kind to me. My first impression was that Spaniards speak very fast, but little by little I got used to the accent.

### What I liked most

- Spanish food is delicious, especially paella
- The museums are incredible
- Nightlife is very lively
- People are very welcoming

## My Adventures in Barcelona

After Madrid, I traveled to Barcelona. This city is completely different. Gaudí's architecture left me speechless. Park Güell is a magical place where you can spend hours admiring the artist's creativity.

### Phrases I learned

- "¿Cómo se dice...?" - How do you say...?
- "No entiendo" - I don't understand
- "¿Puedes repetir, por favor?" - Can you repeat, please?
- "Muchas gracias" - Thank you very much

## Conclusion

My experience in Spain was unforgettable. Not only did I improve my Spanish, but I also made friends for life. I recommend everyone to visit this beautiful country.`,
        reading: "Reading",
        dictionary: "Dictionary",
        learning: "Learning",
        light: "Light",
        dark: "Dark",
    },
    es: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Detectando...",
        currentConfig: "Español → Inglés",
        loadSampleText: "Cargar Texto de Muestra",
        loadButton: "Cargar",
        loadingText: "Cargando...",
        plainView: "Vista Plana",
        markdownView: "Vista Markdown",
        instructions: "Instrucciones:",
        instructionsText:
            "Selecciona texto para crear frases. Puedes cargar un texto de muestra o escribir tu propio texto.",
        dontShowAgain: "No mostrar más",
        characters: "caracteres",
        writeOrPasteText: "Escribe o pega tu texto aquí...",
        selectPhrase: "Seleccionar Frase",
        selectedText: "Texto seleccionado",
        phrase: "Frase:",
        editPhrasePlaceholder: "Edita la frase si es necesario",
        context: "Contexto (opcional):",
        contextPlaceholder: "Añade contexto adicional...",
        translation: "Traducción (opcional):",
        translationPlaceholder: "Traducción al inglés...",
        cancel: "Cancelar",
        savePhrase: "Guardar Frase",
        phraseEmpty: "La frase no puede estar vacía",
        phraseSaved: "ha sido guardada en tu diccionario",
        sampleTitle: "Mi Viaje a España",
        sampleSubtitle: "Mi Primera Semana en Madrid",
        sampleContent:
            "Hola, me llamo María y soy de México. El año pasado decidí viajar a España para mejorar mi español y conocer la cultura española.",
        sampleText: `# Mi Viaje a España

Hola, me llamo María y soy de México. El año pasado decidí viajar a España para mejorar mi español y conocer la cultura española.

## Mi Primera Semana en Madrid

Cuando llegué a Madrid, me sentí un poco nerviosa porque no conocía a nadie. Sin embargo, la gente fue muy amable conmigo. Mi primera impresión fue que los españoles hablan muy rápido, pero poco a poco me acostumbré al acento.

### Lo que más me gustó

- La comida española es deliciosa, especialmente la paella
- Los museos son increíbles
- La vida nocturna es muy animada
- La gente es muy acogedora

## Mis Aventuras en Barcelona

Después de Madrid, viajé a Barcelona. Esta ciudad es completamente diferente. La arquitectura de Gaudí me dejó sin palabras. El Parque Güell es un lugar mágico donde puedes pasar horas admirando la creatividad del artista.

### Frases que aprendí

- "¿Cómo se dice...?" - How do you say...?
- "No entiendo" - I don't understand
- "¿Puedes repetir, por favor?" - Can you repeat, please?
- "Muchas gracias" - Thank you very much

## Conclusión

Mi experiencia en España fue inolvidable. No solo mejoré mi español, sino que también hice amigos para toda la vida. Recomiendo a todos que visiten este hermoso país.`,
        reading: "Lectura",
        dictionary: "Diccionario",
        learning: "Aprendizaje",
        light: "Claro",
        dark: "Oscuro",
    },
    fr: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Détection...",
        currentConfig: "Français → Anglais",
        loadSampleText: "Charger Texte d'Exemple",
        loadButton: "Charger",
        loadingText: "Chargement...",
        plainView: "Vue Simple",
        markdownView: "Vue Markdown",
        instructions: "Instructions:",
        instructionsText:
            "Sélectionnez du texte pour créer des phrases. Vous pouvez charger un texte d'exemple ou écrire votre propre texte.",
        dontShowAgain: "Ne plus afficher",
        characters: "caractères",
        writeOrPasteText: "Écrivez ou collez votre texte ici...",
        selectPhrase: "Sélectionner Phrase",
        selectedText: "Texte sélectionné",
        phrase: "Phrase:",
        editPhrasePlaceholder: "Modifiez la phrase si nécessaire",
        context: "Contexte (optionnel):",
        contextPlaceholder: "Ajoutez un contexte supplémentaire...",
        translation: "Traduction (optionnelle):",
        translationPlaceholder: "Traduction en anglais...",
        cancel: "Annuler",
        savePhrase: "Sauvegarder Phrase",
        phraseEmpty: "La phrase ne peut pas être vide",
        phraseSaved: "a été sauvegardée dans votre dictionnaire",
        sampleTitle: "Mon Voyage en Espagne",
        sampleSubtitle: "Ma Première Semaine à Madrid",
        sampleContent:
            "Bonjour, je m'appelle María et je viens du Mexique. L'année dernière, j'ai décidé de voyager en Espagne pour améliorer mon espagnol et découvrir la culture espagnole.",
        sampleText: `# Mon Voyage en Espagne

Bonjour, je m'appelle María et je viens du Mexique. L'année dernière, j'ai décidé de voyager en Espagne pour améliorer mon espagnol et découvrir la culture espagnole.

## Ma Première Semaine à Madrid

Quand je suis arrivée à Madrid, je me sentais un peu nerveuse parce que je ne connaissais personne. Cependant, les gens ont été très gentils avec moi. Ma première impression était que les Espagnols parlent très vite, mais petit à petit je me suis habituée à l'accent.

### Ce que j'ai le plus aimé

- La nourriture espagnole est délicieuse, surtout la paella
- Les musées sont incroyables
- La vie nocturne est très animée
- Les gens sont très accueillants

## Mes Aventures à Barcelone

Après Madrid, j'ai voyagé à Barcelone. Cette ville est complètement différente. L'architecture de Gaudí m'a laissée sans voix. Le Parc Güell est un endroit magique où vous pouvez passer des heures à admirer la créativité de l'artiste.

### Phrases que j'ai apprises

- "¿Cómo se dice...?" - Comment dit-on...?
- "No entiendo" - Je ne comprends pas
- "¿Puedes repetir, por favor?" - Peux-tu répéter, s'il te plaît?
- "Muchas gracias" - Merci beaucoup

## Conclusion

Mon expérience en Espagne était inoubliable. Non seulement j'ai amélioré mon espagnol, mais j'ai aussi fait des amis pour la vie. Je recommande à tous de visiter ce beau pays.`,
        reading: "Lecture",
        dictionary: "Dictionnaire",
        learning: "Apprentissage",
        light: "Clair",
        dark: "Sombre",
    },
    de: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Erkennung...",
        currentConfig: "Deutsch → Englisch",
        loadSampleText: "Beispieltext Laden",
        loadButton: "Laden",
        loadingText: "Laden...",
        plainView: "Einfache Ansicht",
        markdownView: "Markdown Ansicht",
        instructions: "Anweisungen:",
        instructionsText:
            "Wählen Sie Text aus, um Phrasen zu erstellen. Sie können einen Beispieltext laden oder Ihren eigenen Text schreiben.",
        dontShowAgain: "Nicht mehr anzeigen",
        characters: "Zeichen",
        writeOrPasteText: "Schreiben oder fügen Sie Ihren Text hier ein...",
        selectPhrase: "Phrase Auswählen",
        selectedText: "Ausgewählter Text",
        phrase: "Phrase:",
        editPhrasePlaceholder: "Phrase bei Bedarf bearbeiten",
        context: "Kontext (optional):",
        contextPlaceholder: "Zusätzlichen Kontext hinzufügen...",
        translation: "Übersetzung (optional):",
        translationPlaceholder: "Übersetzung ins Englische...",
        cancel: "Abbrechen",
        savePhrase: "Phrase Speichern",
        phraseEmpty: "Die Phrase darf nicht leer sein",
        phraseSaved: "wurde in Ihrem Wörterbuch gespeichert",
        sampleTitle: "Meine Reise nach Spanien",
        sampleSubtitle: "Meine Erste Woche in Madrid",
        sampleContent:
            "Hallo, ich heiße María und komme aus Mexiko. Letztes Jahr beschloss ich, nach Spanien zu reisen, um mein Spanisch zu verbessern und die spanische Kultur kennenzulernen.",
        sampleText: `# Meine Reise nach Spanien

Hallo, ich heiße María und komme aus Mexiko. Letztes Jahr beschloss ich, nach Spanien zu reisen, um mein Spanisch zu verbessern und die spanische Kultur kennenzulernen.

## Meine Erste Woche in Madrid

Als ich in Madrid ankam, fühlte ich mich etwas nervös, weil ich niemanden kannte. Die Leute waren jedoch sehr freundlich zu mir. Mein erster Eindruck war, dass die Spanier sehr schnell sprechen, aber nach und nach gewöhnte ich mich an den Akzent.

### Was mir am besten gefiel

- Das spanische Essen ist köstlich, besonders die Paella
- Die Museen sind unglaublich
- Das Nachtleben ist sehr lebendig
- Die Leute sind sehr einladend

## Meine Abenteuer in Barcelona

Nach Madrid reiste ich nach Barcelona. Diese Stadt ist völlig anders. Gaudís Architektur ließ mich sprachlos. Der Park Güell ist ein magischer Ort, wo man Stunden damit verbringen kann, die Kreativität des Künstlers zu bewundern.

### Phrasen, die ich lernte

- "¿Cómo se dice...?" - Wie sagt man...?
- "No entiendo" - Ich verstehe nicht
- "¿Puedes repetir, por favor?" - Kannst du bitte wiederholen?
- "Muchas gracias" - Vielen Dank

## Fazit

Meine Erfahrung in Spanien war unvergesslich. Ich verbesserte nicht nur mein Spanisch, sondern fand auch Freunde fürs Leben. Ich empfehle jedem, dieses schöne Land zu besuchen.`,
        reading: "Lesen",
        dictionary: "Wörterbuch",
        learning: "Lernen",
        light: "Hell",
        dark: "Dunkel",
    },
    it: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Rilevamento...",
        currentConfig: "Italiano → Inglese",
        loadSampleText: "Carica Testo di Esempio",
        loadButton: "Carica",
        loadingText: "Caricamento...",
        plainView: "Vista Semplice",
        markdownView: "Vista Markdown",
        instructions: "Istruzioni:",
        instructionsText:
            "Seleziona il testo per creare frasi. Puoi caricare un testo di esempio o scrivere il tuo testo.",
        dontShowAgain: "Non mostrare più",
        characters: "caratteri",
        writeOrPasteText: "Scrivi o incolla il tuo testo qui...",
        selectPhrase: "Seleziona Frase",
        selectedText: "Testo selezionato",
        phrase: "Frase:",
        editPhrasePlaceholder: "Modifica la frase se necessario",
        context: "Contesto (opzionale):",
        contextPlaceholder: "Aggiungi contesto aggiuntivo...",
        translation: "Traduzione (opzionale):",
        translationPlaceholder: "Traduzione in inglese...",
        cancel: "Annulla",
        savePhrase: "Salva Frase",
        phraseEmpty: "La frase non può essere vuota",
        phraseSaved: "è stata salvata nel tuo dizionario",
        sampleTitle: "Il Mio Viaggio in Spagna",
        sampleSubtitle: "La Mia Prima Settimana a Madrid",
        sampleContent:
            "Ciao, mi chiamo María e vengo dal Messico. L'anno scorso ho deciso di viaggiare in Spagna per migliorare il mio spagnolo e conoscere la cultura spagnola.",
        sampleText: `# Il Mio Viaggio in Spagna

Ciao, mi chiamo María e vengo dal Messico. L'anno scorso ho deciso di viaggiare in Spagna per migliorare il mio spagnolo e conoscere la cultura spagnola.

## La Mia Prima Settimana a Madrid

Quando sono arrivata a Madrid, mi sentivo un po' nervosa perché non conoscevo nessuno. Tuttavia, le persone sono state molto gentili con me. La mia prima impressione è stata che gli spagnoli parlano molto velocemente, ma a poco a poco mi sono abituata all'accento.

### Quello che mi è piaciuto di più

- Il cibo spagnolo è delizioso, specialmente la paella
- I musei sono incredibili
- La vita notturna è molto vivace
- Le persone sono molto accoglienti

## Le Mie Avventure a Barcellona

Dopo Madrid, ho viaggiato a Barcellona. Questa città è completamente diversa. L'architettura di Gaudí mi ha lasciato senza parole. Il Parco Güell è un posto magico dove puoi passare ore ad ammirare la creatività dell'artista.

### Frasi che ho imparato

- "¿Cómo se dice...?" - Come si dice...?
- "No entiendo" - Non capisco
- "¿Puedes repetir, per favore?" - Puoi ripetere, per favore?
- "Muchas gracias" - Grazie mille

## Conclusione

La mia esperienza in Spagna è stata indimenticabile. Non solo ho migliorato il mio spagnolo, ma ho anche fatto amicizie per tutta la vita. Raccomando a tutti di visitare questo bellissimo paese.`,
        reading: "Lettura",
        dictionary: "Dizionario",
        learning: "Apprendimento",
        light: "Chiaro",
        dark: "Scuro",
    },
    pt: {
        appTitle: "Read-n-Learn",
        l1Label: "L1:",
        l2Label: "L2:",
        autoDetect: "Auto",
        auto: "Auto",
        detecting: "Detectando...",
        currentConfig: "Português → Inglês",
        loadSampleText: "Carregar Texto de Exemplo",
        loadButton: "Carregar",
        loadingText: "Carregando...",
        plainView: "Vista Simples",
        markdownView: "Vista Markdown",
        instructions: "Instruções:",
        instructionsText:
            "Selecione texto para criar frases. Você pode carregar um texto de exemplo ou escrever seu próprio texto.",
        dontShowAgain: "Não mostrar mais",
        characters: "caracteres",
        writeOrPasteText: "Escreva ou cole seu texto aqui...",
        selectPhrase: "Selecionar Frase",
        selectedText: "Texto selecionado",
        phrase: "Frase:",
        editPhrasePlaceholder: "Edite a frase se necessário",
        context: "Contexto (opcional):",
        contextPlaceholder: "Adicione contexto adicional...",
        translation: "Tradução (opcional):",
        translationPlaceholder: "Tradução para o inglês...",
        cancel: "Cancelar",
        savePhrase: "Salvar Frase",
        phraseEmpty: "A frase não pode estar vazia",
        phraseSaved: "foi salva no seu dicionário",
        sampleTitle: "Minha Viagem à Espanha",
        sampleSubtitle: "Minha Primeira Semana em Madrid",
        sampleContent:
            "Olá, meu nome é María e sou do México. No ano passado decidi viajar para a Espanha para melhorar meu espanhol e conhecer a cultura espanhola.",
        sampleText: `# Minha Viagem à Espanha

Olá, meu nome é María e sou do México. No ano passado decidi viajar para a Espanha para melhorar meu espanhol e conhecer a cultura espanhola.

## Minha Primeira Semana em Madrid

Quando cheguei a Madrid, me senti um pouco nervosa porque não conhecia ninguém. No entanto, as pessoas foram muito gentis comigo. Minha primeira impressão foi que os espanhóis falam muito rápido, mas aos poucos me acostumei ao sotaque.

### O que mais gostei

- A comida espanhola é deliciosa, especialmente a paella
- Os museus são incríveis
- A vida noturna é muito animada
- As pessoas são muito acolhedoras

## Minhas Aventuras em Barcelona

Depois de Madrid, viajei para Barcelona. Esta cidade é completamente diferente. A arquitetura de Gaudí me deixou sem palavras. O Parque Güell é um lugar mágico onde você pode passar horas admirando a criatividade do artista.

### Frases que aprendi

- "¿Cómo se dice...?" - Como se diz...?
- "No entiendo" - Não entendo
- "¿Puedes repetir, por favor?" - Pode repetir, por favor?
- "Muchas gracias" - Muito obrigada

## Conclusão

Minha experiência na Espanha foi inesquecível. Não apenas melhorei meu espanhol, mas também fiz amigos para toda a vida. Recomendo a todos que visitem este belo país.`,
        reading: "Leitura",
        dictionary: "Dicionário",
        learning: "Aprendizagem",
        light: "Claro",
        dark: "Escuro",
    },
};
