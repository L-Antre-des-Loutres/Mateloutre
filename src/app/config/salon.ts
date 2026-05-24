import {SalonCategory, SalonType} from "../../otterbots/types/salonType";

/** With this function you can get the information of a salon in relation to its creation alias
 * ---------------------
* getSalonByAlias("<alias of salon>")
 * ---------------------
**/

/**
 * @types {SalonCategory[]} Array of salon category objects.
 * @property {number} id The unique identifier of the category.
 * @property {string} name The name of the category.
 * @property {string} role_id The identifier of the role associated with the category.
  **/
export const salonCategory: SalonCategory[] = [
]

/**
 * @types {SalonType[]} Array of salon configuration objects.
 * @property {string} name The name of the salon.
 * @property {string} role_id The identifier of the role associated with the salon.
 * @property {number} type The types of the salon (e.g., 0 for default types).
 * @property {number} category The category ID associated with the salon.
 */
export const botSalon: SalonType[] = [
];