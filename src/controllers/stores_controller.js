const { where } = require('sequelize');
const { stores } = require('../models');

module.exports = {

    // 📌 Método para crear una tienda
    async createStore(req, res) {
        console.log("📌 Intentando crear una tienda...");

        try {
            // Extraer los campos obligatorios del cuerpo de la petición
            let { name, address, store_type_id, neighborhood } = req.body;

            // Validar que los campos obligatorios estén presentes
            if (!name || !address || !store_type_id || !neighborhood) {
                return res.status(400).json({ error: "Faltan datos obligatorios." });
            }

            // Aplicar transformación al nombre: eliminar espacios, reemplazar múltiples espacios por uno y convertir a mayúsculas
            if (name) {
                name = name.trim().replace(/\s+/g, ' ').toUpperCase();
            }

            // Aplicar transformación al barrio: eliminar espacios, reemplazar múltiples espacios por uno y poner la primera letra de cada palabra en mayúscula
            if (neighborhood) {
                neighborhood = neighborhood
                    .trim()
                    .replace(/\s+/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }

            // Actualizar req.body con los valores procesados
            req.body.name = name;
            req.body.neighborhood = neighborhood;

            // Verificar si ya existe una tienda con el mismo nombre y barrio
            const existingStore = await stores.findOne({ where: { name, neighborhood } });
            if (existingStore) {
                return res.status(400).json({ error: "Esta tienda ya existe." });
            }

            // Crear la tienda con los datos proporcionados
            const newStore = await stores.create(req.body);

            // Obtener la tienda creada con sus relaciones completas (store_type y manager)           
            const createdStore = await stores.findOne({
                where: { id: newStore.id },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country',
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            // Devolver la tienda creada con sus relaciones
            return res.status(201).json(createdStore);
        } catch (error) {
            console.error("❌ Error al crear tienda:", error);
            return res.status(500).json({ error: "Error al crear tienda." });
        }
    },

    // 📌 Método para obtener todas las tiendas que le pertenecen a una ruta
    async getStoresbyRoute(req, res) {
        console.log("📌 Intentando obtener todas las tiendas...");
        const { route_id } = req.params;

        try {
            // Obtener todas las tiendas con sus relaciones completas (store_type y manager)
            const allStores = await stores.findAll({
                where: { route_id: route_id },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country',
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            // Devolver todas las tiendas con sus relaciones
            return res.status(200).json(allStores);
        } catch (error) {
            console.error("❌ Error al obtener tiendas:", error);
            return res.status(500).json({ error: "Error al obtener tiendas." });
        }
    },

    // 📌 Método para obtener la lista de tiendas huerfanas
    async getOrphanStores(req, res) {
        console.log("📌 Intentando obtener todas las tiendas huérfanas...");

        try {
            // Obtener todas las tiendas huérfanas (sin ruta asociada)
            const orphanStores = await stores.findAll({
                where: { route_id: null },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country'
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            // Devolver la lista de tiendas huérfanas
            return res.status(200).json(orphanStores);
        } catch (error) {
            console.error("❌ Error al obtener tiendas huérfanas:", error);
            return res.status(500).json({ error: "Error al obtener tiendas huérfanas." });
        }
    },

    // 📌 Método para eliminar una tienda 
    async deleteStore(req, res) {
        console.log("📌 Intentando eliminar una tienda...");
        try {
            const { id } = req.params;

            // Verificar si la tienda existe
            const store = await stores.findByPk(id);
            if (!store) {
                return res.status(404).json({ error: "Tienda no encontrada." });
            }

            // Eliminar la tienda
            await stores.destroy({ where: { id } });

            return res.status(200).json({ message: "Tienda eliminada exitosamente." });
        } catch (error) {
            console.error("❌ Error al eliminar tienda:", error);
            return res.status(500).json({ error: "Error al eliminar tienda." });
        }
    },

    // 📌 Método para actualizar una tienda por id
    async updateStore(req, res) {
        console.log("📌 Intentando actualizar una tienda...");
        const { id } = req.params;

        try {
            // Verificar si la tienda existe
            const store = await stores.findByPk(id);
            if (!store) {
                return res.status(404).json({ error: "Tienda no encontrada." });
            }

            // Extraer todos los campos necesarios del body
            let {
                name,
                address,
                phone,
                neighborhood,
                route_id,
                image_url,
                latitude,
                longitude,
                opening_time,
                closing_time,
                city,
                state,
                country,
                store_type_id,
                manager_id
            } = req.body;

            // Validar que los campos obligatorios estén presentes
            if (!name || !address || !store_type_id || !neighborhood) {
                return res.status(400).json({ error: "Faltan datos obligatorios." });
            }

            // Transformar el nombre: eliminar espacios extra y convertir a mayúsculas
            name = name.trim().replace(/\s+/g, ' ').toUpperCase();

            // Actualizar los campos de la tienda (manteniendo los que no se envían)
            store.name = name;
            store.address = address;
            store.phone = phone || store.phone;
            store.neighborhood = neighborhood;            
            store.route_id = route_id !== undefined ? route_id : store.route_id;
            store.image_url = image_url || store.image_url;
            store.latitude = latitude || store.latitude;
            store.longitude = longitude || store.longitude;
            store.opening_time = opening_time || store.opening_time;
            store.closing_time = closing_time || store.closing_time;
            store.city = city || store.city;
            store.state = state || store.state;
            store.country = country || store.country;
            store.store_type_id = store_type_id;
            store.manager_id = manager_id || store.manager_id;

            // Guardar los cambios en la base de datos
            const newStore = await store.save();

            // Obtener la tienda actualizada con sus relaciones completas (store_type y manager)
            const updatedStore = await stores.findOne({
                where: { id: newStore.id },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country'
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            console.log("✅ Tienda actualizada:", updatedStore);
            // Devuelve la tienda actualizada
            return res.status(200).json(updatedStore);
        } catch (error) {
            console.error("❌ Error al actualizar tienda:", error);
            return res.status(500).json({ error: "Error al actualizar tienda." });
        }
    }

}