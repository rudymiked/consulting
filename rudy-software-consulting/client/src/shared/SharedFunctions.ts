export const isNullOrEmpty = (str: string | null | undefined): boolean => {
    return str === null || str === undefined || str.length === 0;
}