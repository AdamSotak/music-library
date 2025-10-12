const formatNumber = (number: number) => {
	return number.toLocaleString("en-US")
}

const getInitialLetter = (name: string) => {
	return name.charAt(0).toUpperCase()
}

export const Utils = {
	formatNumber,
	getInitialLetter,
}
