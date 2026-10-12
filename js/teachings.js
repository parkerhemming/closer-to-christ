// What each marker in the scene teaches (js/markers.js). Scriptures are
// listed restoration first (Book of Mormon, Doctrine and Covenants, Pearl of
// Great Price), then the Bible, and quoted from the Church's editions.
//
// picture: an optional close-up shown at the top of the card.
// wide: a wider card, for long scriptures.
// at: where the marker sits.
//   On the figure: { figure: [x, y] } in pixels of the 1186x2337 artwork.
//   In the scene: { layer, style }, placed by CSS within that layer: "city"
//   lies over the Jerusalem image (sized by the screen's width, anchored at
//   its bottom), "olives" over the Mount of Olives and "sky" is a point
//   in the sky (placed in styles.css).
const teachings = [
	{
		id: "palm",
		at: { figure: [95, 240] },
		title: "The Prints of the Nails",
		text: "The risen Savior invited the Nephites to feel the prints of the nails in his hands, so they would know he is the God of Israel, slain for the sins of the world. He has graven each of us upon the palms of his hands.",
		scriptures: [
			["1 Nephi 21:16", "Behold, I have graven thee upon the palms of my hands; thy walls are continually before me."],
			["3 Nephi 11:14", "Arise and come forth unto me, that ye may thrust your hands into my side, and also that ye may feel the prints of the nails in my hands and in my feet, that ye may know that I am the God of Israel, and the God of the whole earth, and have been slain for the sins of the world."],
			["John 20:27", "Then saith he to Thomas, Reach hither thy finger, and behold my hands; and reach hither thy hand, and thrust it into my side: and be not faithless, but believing."],
		],
	},
	{
		id: "wrist",
		at: { figure: [1040, 290] },
		title: "A Nail in a Sure Place",
		text: "Some scholars believe the nails were driven through the wrists, where the bones could bear the weight of a body; the Greek word for hand can include the wrist. Many see in Isaiah's nail fastened “in a sure place” a type of the Savior, who bears the weight of us all.",
		scriptures: [
			["Mosiah 14:5", "But he was wounded for our transgressions, he was bruised for our iniquities; the chastisement of our peace was upon him; and with his stripes we are healed."],
			["D&C 45:51–52", "And then shall the Jews look upon me and say: What are these wounds in thine hands and in thy feet? Then shall they know that I am the Lord; for I will say unto them: These wounds are the wounds with which I was wounded in the house of my friends. I am he who was lifted up. I am Jesus that was crucified. I am the Son of God."],
			["Isaiah 22:23", "And I will fasten him as a nail in a sure place; and he shall be for a glorious throne to his father's house."],
		],
	},
	{
		id: "feet",
		at: { figure: [640, 1825] },
		title: "His Hands and His Feet",
		text: "After his Resurrection the Savior showed his hands and feet to his disciples in Jerusalem and to the Nephites, so they would know he had risen with a body of flesh and bones.",
		scriptures: [
			["3 Nephi 11:15", "And it came to pass that the multitude went forth, and thrust their hands into his side, and did feel the prints of the nails in his hands and in his feet; and this they did do, going forth one by one until they had all gone forth, and did see with their eyes and did feel with their hands, and did know of a surety and did bear record, that it was he, of whom it was written by the prophets, that should come."],
			["D&C 130:22", "The Father has a body of flesh and bones as tangible as man's; the Son also; but the Holy Ghost has not a body of flesh and bones, but is a personage of Spirit. Were it not so, the Holy Ghost could not dwell in us."],
			["Luke 24:39", "Behold my hands and my feet, that it is I myself: handle me, and see; for a spirit hath not flesh and bones, as ye see me have."],
		],
	},
	{
		id: "crown",
		at: { figure: [480, 520] },
		title: "The Crown of Thorns",
		text: "The soldiers mocked the King of kings with a crown of thorns. Thorns came into the world with the Fall; the Savior wore them as he overcame the Fall for all.",
		scriptures: [
			["1 Nephi 19:9", "And the world, because of their iniquity, shall judge him to be a thing of naught; wherefore they scourge him, and he suffereth it; and they smite him, and he suffereth it. Yea, they spit upon him, and he suffereth it, because of his loving kindness and his long-suffering towards the children of men."],
			["Moses 4:24", "Thorns also, and thistles shall it bring forth to thee, and thou shalt eat the herb of the field."],
			["Matthew 27:29", "And when they had plaited a crown of thorns, they put it upon his head, and a reed in his right hand: and they bowed the knee before him, and mocked him, saying, Hail, King of the Jews!"],
		],
	},
	{
		id: "side",
		at: { figure: [680, 850] },
		title: "The Wound in His Side",
		text: "After he died, a soldier pierced his side with a spear. The risen Lord still points to this wound as a witness of who he is and of what he suffered for us.",
		scriptures: [
			["D&C 6:37", "Behold the wounds which pierced my side, and also the prints of the nails in my hands and feet; be faithful, keep my commandments, and ye shall inherit the kingdom of heaven. Amen."],
			["John 19:34", "But one of the soldiers with a spear pierced his side, and forthwith came there out blood and water."],
		],
	},
	{
		id: "forgive",
		at: { figure: [585, 965] },
		title: "Father, Forgive Them",
		text: "Even on the cross the Savior prayed for those who crucified him. Through his Atonement he offers forgiveness to all who repent, and he asks us to forgive one another.",
		scriptures: [
			["D&C 19:16", "For behold, I, God, have suffered these things for all, that they might not suffer if they would repent;"],
			["D&C 64:10", "I, the Lord, will forgive whom I will forgive, but of you it is required to forgive all men."],
			["Luke 23:34", "Then said Jesus, Father, forgive them; for they know not what they do. And they parted his raiment, and cast lots."],
		],
	},
	{
		id: "sign",
		at: { figure: [588, 165] },
		title: "The King of the Jews",
		wide: true,
		picture: {
			src: "./assets/christ/titulus-v1.avif",
			alt: "A whitewashed wooden board lettered in Hebrew, Greek and Latin",
			caption: "A reconstruction of the sign, in Hebrew, Greek and Latin: \u201cJesus of Nazareth, the King of the Jews\u201d (John 19:19\u201320)",
		},
		text: "Pilate had the charge written in Hebrew, Greek and Latin. INRI stands for the Latin Iesus Nazarenus Rex Iudaeorum: Jesus of Nazareth, the King of the Jews. Meant as mockery, it was true.",
		scriptures: [
			["Mosiah 3:8", "And he shall be called Jesus Christ, the Son of God, the Father of heaven and earth, the Creator of all things from the beginning; and his mother shall be called Mary."],
			["John 19:19–20", "And Pilate wrote a title, and put it on the cross. And the writing was, JESUS OF NAZARETH THE KING OF THE JEWS. This title then read many of the Jews: for the place where Jesus was crucified was nigh to the city: and it was written in Hebrew, and Greek, and Latin."],
		],
	},
	{
		id: "cross",
		at: { figure: [660, 400] },
		title: "Lifted Up upon the Cross",
		text: "Jesus carried his cross to a hill outside Jerusalem called Golgotha, \u201cthe place of a skull\u201d (Calvary, in Latin). Six hundred years before, Nephi saw in vision that he would be lifted up upon the cross, so that he might draw all people to him.",
		scriptures: [
			["1 Nephi 11:33", "And I, Nephi, saw that he was lifted up upon the cross and slain for the sins of the world."],
			["3 Nephi 27:14", "And my Father sent me that I might be lifted up upon the cross; and after that I had been lifted up upon the cross, that I might draw all men unto me…"],
			["Moses 7:55", "And the Lord said unto Enoch: Look, and he looked and beheld the Son of Man lifted up on the cross, after the manner of men;"],
			["John 19:17\u201318", "And he bearing his cross went forth into a place called the place of a skull, which is called in the Hebrew Golgotha: Where they crucified him, and two other with him, on either side one, and Jesus in the midst."],
			["John 12:32", "And I, if I be lifted up from the earth, will draw all men unto me."],
		],
	},
	{
		id: "olives",
		at: { layer: "olives", style: "left: 22%; top: 30%" },
		title: "The Mount of Olives",
		wide: true,
		text: "Across the Kidron Valley, east of the city. On its slopes, in the garden of Gethsemane, the Savior's suffering for our sins began the night before he was crucified. From this mount he ascended into heaven, and to it he will return.",
		scriptures: [
			["Mosiah 3:7", "And lo, he shall suffer temptations, and pain of body, hunger, thirst, and fatigue, even more than man can suffer, except it be unto death; for behold, blood cometh from every pore, so great shall be his anguish for the wickedness and the abominations of his people."],
			["D&C 19:18", "Which suffering caused myself, even God, the greatest of all, to tremble because of pain, and to bleed at every pore, and to suffer both body and spirit\u2014and would that I might not drink the bitter cup, and shrink\u2014"],
			["D&C 45:48", "And then shall the Lord set his foot upon this mount, and it shall cleave in twain, and the earth shall tremble, and reel to and fro, and the heavens also shall shake."],
			["Luke 22:44", "And being in an agony he prayed more earnestly: and his sweat was as it were great drops of blood falling down to the ground."],
			["Acts 1:11\u201312", "Which also said, Ye men of Galilee, why stand ye gazing up into heaven? this same Jesus, which is taken up from you into heaven, shall so come in like manner as ye have seen him go into heaven. Then returned they unto Jerusalem from the mount called Olivet, which is from Jerusalem a sabbath day's journey."],
		],
	},
	{
		id: "jerusalem",
		at: { layer: "city", style: "left: 75%; bottom: 12vw" },
		title: "Jerusalem",
		text: "The Savior was crucified just outside the walls of Jerusalem, the city of the temple and of the prophets. He wept over it, longing to gather its people as a hen gathers her chickens.",
		scriptures: [
			["3 Nephi 10:5", "And again, how oft would I have gathered you as a hen gathereth her chickens under her wings, yea, O ye people of the house of Israel, who have fallen; yea, O ye people of the house of Israel, ye that dwell at Jerusalem, as ye that have fallen; yea, how oft would I have gathered you as a hen gathereth her chickens, and ye would not."],
			["Matthew 23:37", "O Jerusalem, Jerusalem, thou that killest the prophets, and stonest them which are sent unto thee, how often would I have gathered thy children together, even as a hen gathereth her chickens under her wings, and ye would not!"],
			["Hebrews 13:12", "Wherefore Jesus also, that he might sanctify the people with his own blood, suffered without the gate."],
		],
	},
	{
		id: "darkness",
		at: { layer: "sky", style: "left: 0; top: 0" }, // the spot is set in styles.css
		title: "Darkness over the Land",
		wide: true,
		text: "From the sixth hour to the ninth (noon to 3 PM) darkness covered the land. In the Americas his death was marked by a great storm, earthquakes and three days of darkness, as the prophets had foretold.",
		scriptures: [
			["3 Nephi 8:5–6", "And it came to pass in the thirty and fourth year, in the first month, on the fourth day of the month, there arose a great storm, such an one as never had been known in all the land. And there was also a great and terrible tempest; and there was terrible thunder, insomuch that it did shake the whole earth as if it was about to divide asunder."],
			["3 Nephi 8:20", "And it came to pass that there was thick darkness upon all the face of the land, insomuch that the inhabitants thereof who had not fallen could feel the vapor of darkness;"],
			["Moses 7:56", "And he heard a loud voice; and the heavens were veiled; and all the creations of God mourned; and the earth groaned; and the rocks were rent; and the saints arose, and were crowned at the right hand of the Son of Man, with crowns of glory;"],
			["Luke 23:44–45", "And it was about the sixth hour, and there was a darkness over all the earth until the ninth hour. And the sun was darkened, and the veil of the temple was rent in the midst."],
		],
	},
];
